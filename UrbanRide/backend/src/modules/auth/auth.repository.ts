import { prisma } from '../../common/database/prisma'

export function findUserByUsername(username: string) {
  return prisma.user.findUnique({
    where: {
      username,
    },
  })
}

export function findUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

export function updateUserRideStartOtpPreference(
  id: string,
  rideStartOtpEnabled: boolean,
) {
  return prisma.user.update({
    where: { id },
    data: { rideStartOtpEnabled },
    select: { rideStartOtpEnabled: true },
  });
}

export function createUser(data: {
  username: string
  passwordHash: string
  role: 'CUSTOMER' | 'RIDER' | 'CLIENT_ADMIN' | 'ADMIN'
  tenantId?: string | null
}) {
  return prisma.user.create({
    data,
  })
}
