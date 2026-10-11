import { prisma } from '../../common/database/prisma'
import type { Prisma } from '../../generated/prisma/client'

export function createCorporateAccount(data: Prisma.CorporateAccountCreateInput) {
  return prisma.corporateAccount.create({ data })
}

export function findCorporateAccountById(id: string) {
  return prisma.corporateAccount.findUnique({ where: { id } })
}

export function findCorporateAccountByAccessCode(accessCode: string) {
  return prisma.corporateAccount.findUnique({ where: { accessCode } })
}

export function findCorporateAccountByTenantId(tenantId: string) {
  return prisma.corporateAccount.findUnique({ where: { tenantId } })
}

export function createCorporateEmployee(data: Prisma.CorporateEmployeeCreateInput) {
  return prisma.corporateEmployee.create({ data })
}

export function findCorporateEmployeeByEmail(email: string) {
  return prisma.corporateEmployee.findUnique({ where: { email } })
}

export function findCorporateEmployeeByInvitationTokenHash(invitationTokenHash: string) {
  return prisma.corporateEmployee.findFirst({
    where: { invitationTokenHash, invitationExpiresAt: { gt: new Date() }, activatedAt: null, active: true },
    include: { corporateAccount: true },
  })
}

export async function activateCorporateEmployee(input: {
  employeeId: string
  invitationTokenHash: string
  username: string
  passwordHash: string
  fullName: string
  email: string
  phone: string | null
  countryCode: string | null
}) {
  return prisma.$transaction(async (tx) => {
    const employee = await tx.corporateEmployee.findUnique({ where: { id: input.employeeId }, include: { corporateAccount: true } })
    if (!employee || !employee.active || employee.activatedAt || employee.invitationTokenHash !== input.invitationTokenHash || !employee.invitationExpiresAt || employee.invitationExpiresAt <= new Date()) {
      return null
    }
    const user = await tx.user.create({
      data: {
        username: input.username,
        passwordHash: input.passwordHash,
        role: 'CUSTOMER',
        tenantId: employee.corporateAccount.tenantId,
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        countryCode: input.countryCode,
      },
    })
    const consumed = await tx.corporateEmployee.updateMany({
      where: { id: employee.id, invitationTokenHash: input.invitationTokenHash, activatedAt: null, active: true, invitationExpiresAt: { gt: new Date() } },
      data: {
        userId: user.id,
        activatedAt: new Date(),
        invitationTokenHash: null,
        invitationExpiresAt: null,
      },
    })
    if (consumed.count !== 1) throw new Error('Invitation was already consumed.')
    return { user, employee: { ...employee, userId: user.id, activatedAt: new Date() } }
  })
}

export function findCorporateEmployees(corporateAccountId: string) {
  return prisma.corporateEmployee.findMany({
    where: { corporateAccountId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, corporateAccountId: true, name: true, email: true, phone: true, active: true, userId: true, activatedAt: true, createdAt: true, updatedAt: true },
  })
}

export function findCorporateRides(corporateAccountId: string) {
  return prisma.ride.findMany({ where: { corporateAccountId }, orderBy: { requestedAt: 'desc' } })
}

export function getCorporateBillingSummary(corporateAccountId: string) {
  return prisma.payment.findMany({
    where: { ride: { corporateAccountId } },
    orderBy: { createdAt: 'desc' },
  })
}

export function getCorporateReportData(corporateAccountId: string) {
  return prisma.ride.findMany({
    where: { corporateAccountId },
    select: {
      id: true, customerId: true, status: true, estimatedDistance: true,
      estimatedFare: true, finalFare: true, requestedAt: true, completedAt: true,
      payment: { select: { amount: true, status: true } },
    },
    orderBy: { requestedAt: 'desc' },
  })
}

export async function registerCorporateAccountWithAdmin(input: {
  name: string
  billingEmail: string
  accessCode: string
  tenantId: string
  adminUsername: string
  adminEmail: string
  adminPasswordHash: string
  adminName: string
}) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.corporateAccount.create({
      data: {
        name: input.name,
        billingEmail: input.billingEmail,
        accessCode: input.accessCode,
        tenantId: input.tenantId,
      },
    })
    const admin = await tx.user.create({
      data: {
        username: input.adminUsername,
        email: input.adminEmail,
        passwordHash: input.adminPasswordHash,
        role: 'CLIENT_ADMIN',
        tenantId: input.tenantId,
        fullName: input.adminName,
        active: true,
      },
      select: { id: true, username: true, email: true, fullName: true, role: true, tenantId: true },
    })
    return { account, admin }
  })
}

export function findCorporateEmployeeByIdentifier(identifier: string) {
  return prisma.corporateEmployee.findFirst({
    where: {
      active: true,
      OR: [
        { email: identifier },
        { user: { is: { username: identifier } } },
      ],
    },
    include: { corporateAccount: true },
  })
}
