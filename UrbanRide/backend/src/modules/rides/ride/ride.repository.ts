
import { prisma } from '../../../common/database/prisma';
import type { Prisma } from '../../../generated/prisma/client';
import type { RideStatus } from '../../../generated/prisma/client';

export function createRide(data: Prisma.RideCreateInput) {
  return prisma.ride.create({
    data,
  });
}

export function findRideById(id: string) {
  return prisma.ride.findUnique({
    where: { id },
    include: {
      rating: { select: { score: true, feedback: true } },
      payment: { select: { status: true, amount: true, mode: true } },
    },
  });
}

export function findCustomerRides(customerId: string) {
  return prisma.ride.findMany({
    where: {
      customerId,
    },
    orderBy: {
      requestedAt: 'desc',
    },
    include: { rating: { select: { score: true, feedback: true } } },
  });
}

export function findActiveCustomerRide(customerId: string) {
  return prisma.ride.findFirst({
    where: {
      customerId,
      status: {
        in: [
          'REQUESTED',
          'SEARCHING',
          'ASSIGNED',
          'DRIVER_ARRIVING',
          'IN_PROGRESS',
        ],
      },
    },
    orderBy: {
      requestedAt: 'desc',
    },
  });
}

export function findActiveRiderRide(riderId: string) {
  return prisma.ride.findFirst({
    where: {
      riderId,
      status: { in: ['ASSIGNED', 'DRIVER_ARRIVING', 'IN_PROGRESS'] },
    },
    orderBy: { updatedAt: 'desc' },
    include: { payment: { select: { status: true, amount: true, mode: true } } },
  });
}

export function findRiderRideHistory(riderId: string) {
  return prisma.ride.findMany({
    where: { riderId, status: { in: ['COMPLETED', 'CANCELLED'] } },
    orderBy: { requestedAt: 'desc' },
    include: { payment: { select: { status: true, amount: true, mode: true } } },
  });
}

export function createRideRating(data: Prisma.RideRatingCreateInput) {
  return prisma.rideRating.create({ data });
}

export function saveRideStartOtp(
  rideId: string,
  secretHash: string,
  expiresAt: Date,
) {
  return prisma.rideStartOtp.upsert({
    where: { rideId },
    create: { rideId, secretHash, expiresAt },
    update: { secretHash, expiresAt, createdAt: new Date() },
  });
}

export function findRideStartOtp(rideId: string) {
  return prisma.rideStartOtp.findUnique({ where: { rideId } });
}

export function consumeRideStartOtp(rideId: string, secretHash: string) {
  return prisma.rideStartOtp.deleteMany({
    where: { rideId, secretHash, expiresAt: { gt: new Date() } },
  });
}

export function findCustomerOutstandingPayment(customerId: string) {
  return prisma.ride.findFirst({
    where: {
      customerId,
      status: 'COMPLETED',
      OR: [
        { payment: { is: null } },
        { payment: { is: { status: { not: 'CAPTURED' } } } },
      ],
    },
    select: {
      id: true,
      payment: { select: { status: true, amount: true, mode: true } },
    },
  });
}

export async function recordCompletionConfirmation(
  rideId: string,
  party: 'rider' | 'customer',
) {
  return prisma.$transaction(async (tx) => {
    const ride = await tx.ride.findUnique({ where: { id: rideId } });
    if (!ride || !['IN_PROGRESS', 'COMPLETED'].includes(ride.status)) {
      return null;
    }

    const field = party === 'rider' ? 'riderCompletedAt' : 'customerCompletedAt';
    if (!ride[field]) {
      await tx.ride.update({
        where: { id: rideId },
        data: { [field]: new Date() },
      });
    }

    const confirmed = await tx.ride.findUnique({ where: { id: rideId } });
    if (!confirmed) return null;

    if (
      confirmed.status === 'IN_PROGRESS' &&
      confirmed.riderCompletedAt &&
      confirmed.customerCompletedAt
    ) {
      return tx.ride.update({
        where: { id: rideId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
    }

    return confirmed;
  });
}

export function updateRide(id: string, data: Prisma.RideUpdateInput) {
  return prisma.ride.update({
    where: { id },
    data,
    include: { payment: { select: { status: true, amount: true, mode: true } } },
  });
}

export async function updateRideStatusIfCurrent(
  id: string,
  status: RideStatus,
  predecessors: readonly RideStatus[],
) {
  const result = await prisma.ride.updateMany({
    where: { id, status: { in: [...predecessors] } },
    data: { status },
  });

  if (result.count !== 1) return null;

  return prisma.ride.findUnique({
    where: { id },
    include: {
      rating: { select: { score: true, feedback: true } },
      payment: { select: { status: true, amount: true, mode: true } },
    },
  });
}

export async function findRequestedRides() {
  const expiry = new Date(Date.now() - 15 * 60 * 1000);

  return prisma.ride.findMany({
    where: {
      status: {
        in: ['REQUESTED', 'SEARCHING'],
      },
      requestedAt: { gte: expiry },
    },
    orderBy: {
      requestedAt: 'asc',
    },
  });
}

export type AssignRideResult =
  | {
      kind: 'assigned';
      ride: NonNullable<Awaited<ReturnType<typeof prisma.ride.findUnique>>>;
    }
  | {
      kind: 'already-assigned';
      ride: NonNullable<Awaited<ReturnType<typeof prisma.ride.findUnique>>>;
    }
  | { kind: 'busy' }
  | { kind: 'unavailable' }
  | { kind: 'not-found' };

/**
 * Serializes ride claims by rider in PostgreSQL and uses a conditional update
 * for the ride itself. A partial unique index in the companion migration is
 * the final database-level guard, including against writers that bypass this
 * repository method.
 */
export async function assignRideToRiderIfAvailable(
  rideId: string,
  riderId: string,
): Promise<AssignRideResult> {
  return prisma.$transaction(async (tx) => {
    // Return an integer instead of PostgreSQL's void result from the lock.
    // The advisory lock is still acquired within this transaction.
    await tx.$queryRaw`
      SELECT 1::int AS locked
      FROM (
        SELECT pg_advisory_xact_lock(
          hashtextextended(${`rider-assignment:${riderId}`}, 0)
        )
      ) AS advisory_lock
    `;

    const ride = await tx.ride.findUnique({ where: { id: rideId } });
    if (!ride) return { kind: 'not-found' };

    const activeStatuses = [
      'ASSIGNED',
      'DRIVER_ARRIVING',
      'IN_PROGRESS',
    ] as const;

    if (
      ride.riderId === riderId &&
      activeStatuses.includes(
        ride.status as (typeof activeStatuses)[number],
      )
    ) {
      const current = await tx.ride.findUnique({
        where: { id: rideId },
        include: {
          payment: { select: { status: true, amount: true, mode: true } },
        },
      });

      return current
        ? { kind: 'already-assigned', ride: current }
        : { kind: 'not-found' };
    }

    const otherActiveRide = await tx.ride.findFirst({
      where: {
        riderId,
        status: { in: [...activeStatuses] },
        id: { not: rideId },
      },
      select: { id: true },
    });

    if (otherActiveRide) return { kind: 'busy' };

    const update = await tx.ride.updateMany({
      where: {
        id: rideId,
        riderId: null,
        status: { in: ['REQUESTED', 'SEARCHING'] },
      },
      data: {
        riderId,
        status: 'ASSIGNED',
        assignedAt: new Date(),
      },
    });

    if (update.count !== 1) return { kind: 'unavailable' };

    const assigned = await tx.ride.findUnique({
      where: { id: rideId },
      include: {
        payment: { select: { status: true, amount: true, mode: true } },
      },
    });

    return assigned
      ? { kind: 'assigned', ride: assigned }
      : { kind: 'not-found' };
  });
}

export function assignRide(id: string, riderId: string) {
  return prisma.ride.update({
    where: { id },
    data: {
      riderId,
      status: 'ASSIGNED',
      assignedAt: new Date(),
    },
    include: { payment: { select: { status: true, amount: true, mode: true } } },
  });
}

export function findCorporateRides(corporateAccountId: string) {
  return prisma.ride.findMany({
    where: {
      corporateAccountId,
    },
    orderBy: {
      requestedAt: 'desc',
    },
  });
}

/** Atomically expires old, unassigned requests and returns only rows this run changed. */
export async function expireStaleRequestedRides() {
  const expiry = new Date(Date.now() - 15 * 60 * 1_000);

  const candidates = await prisma.ride.findMany({
    where: {
      status: { in: ['REQUESTED', 'SEARCHING'] },
      requestedAt: { lt: expiry },
      riderId: null,
    },
    select: { id: true },
  });

  const expired = [];

  for (const candidate of candidates) {
    const changed = await prisma.ride.updateMany({
      where: {
        id: candidate.id,
        status: { in: ['REQUESTED', 'SEARCHING'] },
        riderId: null,
        requestedAt: { lt: expiry },
      },
      data: {
        status: 'CANCELLED',
        cancellationReason: 'SYSTEM',
        cancelledAt: new Date(),
      },
    });

    if (changed.count === 1) {
      const ride = await prisma.ride.findUnique({
        where: { id: candidate.id },
      });
      if (ride) expired.push(ride);
    }
  }

  return expired;
}

/** Completes rides left awaiting customer confirmation for the configured grace period. */
export async function autoCompleteAbandonedRides() {
  const graceHours = Number(process.env.RIDE_AUTO_COMPLETE_AFTER_HOURS) || 24;
  const cutoff = new Date(Date.now() - graceHours * 60 * 60 * 1_000);

  const candidates = await prisma.ride.findMany({
    where: {
      status: 'IN_PROGRESS',
      riderCompletedAt: { lt: cutoff },
      customerCompletedAt: null,
    },
    select: { id: true },
  });

  const completed = [];

  for (const candidate of candidates) {
    const changed = await prisma.ride.updateMany({
      where: {
        id: candidate.id,
        status: 'IN_PROGRESS',
        riderCompletedAt: { lt: cutoff },
        customerCompletedAt: null,
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    if (changed.count === 1) {
      const ride = await prisma.ride.findUnique({
        where: { id: candidate.id },
      });
      if (ride) completed.push(ride);
    }
  }

  return completed;
}
