import { prisma } from '../../common/database/prisma';
import type { Prisma } from '../../generated/prisma/client';

export function registerRiderDeviceToken(
  data: Prisma.RiderDeviceTokenCreateInput,
) {
  return prisma.riderDeviceToken.upsert({
    where: {
      token: data.token,
    },
    update: {
      riderId: data.riderId,
      platform: data.platform,
      updatedAt: new Date(),
    },
    create: data,
  });
}

export function findRiderDeviceTokens(riderId: string) {
  return prisma.riderDeviceToken.findMany({
    where: {
      riderId,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
}

export function deleteRiderDeviceToken(token: string) {
  return prisma.riderDeviceToken.delete({
    where: {
      token,
    },
  });
}