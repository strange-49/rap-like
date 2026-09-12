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
  });
}

export function updateRide(
  id: string,
  data: Prisma.RideUpdateInput,
) {
  return prisma.ride.update({
    where: { id },
    data,
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
  });
}