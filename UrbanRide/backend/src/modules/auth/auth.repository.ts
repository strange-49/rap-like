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

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
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
  fullName?: string | null
  email?: string | null
  phone?: string | null
  countryCode?: string | null
}) {
  return prisma.user.create({
    data,
  })
}


export function updateUserPasswordHash(id: string, passwordHash: string) {
  return prisma.user.update({ where: { id }, data: { passwordHash } });
}
