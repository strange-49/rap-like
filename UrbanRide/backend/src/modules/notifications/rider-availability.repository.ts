import { prisma } from '../../common/database/prisma';

export async function setRiderAvailability(riderId: string, isOnline: boolean): Promise<boolean | null> {
  const rows = await prisma.$queryRaw<Array<{ isOnline: boolean }>>`
    UPDATE "User"
    SET "isOnline" = ${isOnline}, "updatedAt" = NOW()
    WHERE "id" = ${riderId}
      AND "role" = 'RIDER'
      AND "active" = true
    RETURNING "isOnline"
  `;

  return rows[0]?.isOnline ?? null;
}

export async function getRiderAvailability(riderId: string): Promise<boolean | null> {
  const rows = await prisma.$queryRaw<Array<{ isOnline: boolean }>>`
    SELECT "isOnline"
    FROM "User"
    WHERE "id" = ${riderId}
      AND "role" = 'RIDER'
      AND "active" = true
    LIMIT 1
  `;

  return rows[0]?.isOnline ?? null;
}

export async function setRiderOfflineOnLogin(riderId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "User"
    SET "isOnline" = false, "updatedAt" = NOW()
    WHERE "id" = ${riderId} AND "role" = 'RIDER'
  `;
}
