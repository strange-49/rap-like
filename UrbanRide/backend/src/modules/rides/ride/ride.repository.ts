import { prisma } from '../../../common/database/prisma';
import type { Prisma } from '../../../generated/prisma/client';

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

export function findActiveCustomerRide(
  customerId: string,
) {
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

export function saveRideStartOtp(rideId: string, secretHash: string, expiresAt: Date) {
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

export function updateRide(
  id: string,
  data: Prisma.RideUpdateInput,
) {
  return prisma.ride.update({
    where: { id },
    data,
    include: { payment: { select: { status: true, amount: true, mode: true } } },
  });
}

export function findRequestedRides() {
  return prisma.ride.findMany({
    where: {
      status: {
        in: ['REQUESTED', 'SEARCHING'],
      },
    },
    orderBy: {
      requestedAt: 'asc',
    },
  });
}

export function assignRide(
  id: string,
  riderId: string,
) {
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

export function findCorporateRides(
  corporateAccountId: string,
) {
  return prisma.ride.findMany({
    where: {
      corporateAccountId,
    },
    orderBy: {
      requestedAt: 'desc',
    },
  });
}
