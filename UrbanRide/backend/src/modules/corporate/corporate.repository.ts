import { prisma } from '../../common/database/prisma'
import type { Prisma } from '../../generated/prisma/client'

export function createCorporateAccount(
  data: Prisma.CorporateAccountCreateInput,
) {
  return prisma.corporateAccount.create({ data })
}

export function findCorporateAccountById(id: string) {
  return prisma.corporateAccount.findUnique({
    where: { id },
  })
}

export function findCorporateAccountByTenantId(
  tenantId: string,
) {
  return prisma.corporateAccount.findUnique({
    where: { tenantId },
  })
}

export function createCorporateEmployee(
  data: Prisma.CorporateEmployeeCreateInput,
) {
  return prisma.corporateEmployee.create({ data })
}

export function findCorporateEmployeeByEmail(
  email: string,
) {
  return prisma.corporateEmployee.findUnique({
    where: { email },
  })
}

export function findCorporateEmployees(
  corporateAccountId: string,
) {
  return prisma.corporateEmployee.findMany({
    where: { corporateAccountId },
    orderBy: { createdAt: 'desc' },
  })
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
  })
}

export function getCorporateBillingSummary(
  corporateAccountId: string,
) {
  return prisma.payment.findMany({
    where: {
      ride: {
        corporateAccountId,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export function getCorporateReportData(
  corporateAccountId: string,
) {
  return prisma.ride.findMany({
    where: {
      corporateAccountId,
    },
    select: {
      id: true,
      customerId: true,
      status: true,
      estimatedDistance: true,
      estimatedFare: true,
      finalFare: true,
      requestedAt: true,
      completedAt: true,
      payment: {
        select: {
          amount: true,
          status: true,
        },
      },
    },
    orderBy: {
      requestedAt: 'desc',
    },
  })
}