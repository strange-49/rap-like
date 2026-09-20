import { prisma } from '../../common/database/prisma'

export function countRides() {
  return prisma.ride.count()
}

export function countRidesByStatus() {
  return prisma.ride.groupBy({
    by: ['status'],
    _count: {
      _all: true,
    },
  })
}

export function countPayments() {
  return prisma.payment.count()
}

export function sumCapturedPayments() {
  return prisma.payment.aggregate({
    where: {
      status: 'CAPTURED',
    },
    _sum: {
      amount: true,
    },
  })
}

export function countCorporateAccounts() {
  return prisma.corporateAccount.count()
}

export function countCorporateEmployees() {
  return prisma.corporateEmployee.count()
}

export function countRiderDeviceTokens() {
  return prisma.riderDeviceToken.count()
}

export function findAllRides() {
  return prisma.ride.findMany({
    orderBy: {
      requestedAt: 'desc',
    },
  })
}

export function findAdminRideById(id: string) {
  return prisma.ride.findUnique({
    where: {
      id,
    },
  })
}

export function findAllPayments() {
  return prisma.payment.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export function findAdminPaymentById(id: string) {
  return prisma.payment.findUnique({
    where: {
      id,
    },
  })
}

export function findAllCorporateAccounts() {
  return prisma.corporateAccount.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  })
}

export function findAdminCorporateAccountById(id: string) {
  return prisma.corporateAccount.findUnique({
    where: {
      id,
    },
    include: {
      employees: true,
      rides: true,
    },
  })
}

export function getAdminRiderActivity() {
  return prisma.ride.groupBy({
    by: ['riderId', 'status'],
    where: {
      riderId: {
        not: null,
      },
    },
    _count: {
      _all: true,
    },
    orderBy: {
      riderId: 'asc',
    },
  })
}

export function getAdminCustomerActivity() {
  return prisma.ride.groupBy({
    by: ['customerId', 'status'],
    _count: {
      _all: true,
    },
    orderBy: {
      customerId: 'asc',
    },
  })
}
