import { AppError } from '../../common/errors/app-error'
import { countCorporateAccounts, countCorporateEmployees, countPayments, countRiderDeviceTokens, countRides, countRidesByStatus, findAdminCorporateAccountById, findAdminPaymentById, findAllCorporateAccounts, findAdminRideById, getAdminRiderActivity as findAdminRiderActivityRows, getAdminCustomerActivity as findAdminCustomerActivityRows, findAllPayments, findAllRides, sumCapturedPayments } from './admin.repository'

export async function getAdminOverview() {
  const [
    totalRides,
    ridesByStatus,
    totalPayments,
    capturedPayments,
    corporateAccounts,
    corporateEmployees,
    riderDeviceTokens,
  ] = await Promise.all([
    countRides(),
    countRidesByStatus(),
    countPayments(),
    sumCapturedPayments(),
    countCorporateAccounts(),
    countCorporateEmployees(),
    countRiderDeviceTokens(),
  ])

  const rideStatusCounts = Object.fromEntries(
    ridesByStatus.map((item) => [item.status, item._count._all]),
  )

  return {
    rides: {
      total: totalRides,
      byStatus: rideStatusCounts,
    },
    payments: {
      total: totalPayments,
      capturedAmount: Number(capturedPayments._sum.amount ?? 0),
    },
    corporate: {
      accounts: corporateAccounts,
      employees: corporateEmployees,
    },
    rider: {
      deviceTokens: riderDeviceTokens,
    },
  }
}

export async function listAdminRides() {
  return findAllRides()
}

export async function getAdminRide(id: string) {
  if (!id.trim()) {
    throw new AppError(
      'Ride ID is required.',
      400,
      'RIDE_ID_REQUIRED',
    )
  }

  const ride = await findAdminRideById(id)

  if (!ride) {
    throw new AppError(
      'Ride not found.',
      404,
      'RIDE_NOT_FOUND',
    )
  }

  return ride
}


export async function listAdminPayments() {
  return findAllPayments()
}

export async function getAdminPayment(id: string) {
  if (!id.trim()) {
    throw new AppError(
      'Payment ID is required.',
      400,
      'PAYMENT_ID_REQUIRED',
    )
  }

  const payment = await findAdminPaymentById(id)

  if (!payment) {
    throw new AppError(
      'Payment not found.',
      404,
      'PAYMENT_NOT_FOUND',
    )
  }

  return payment
}

export async function listAdminCorporateAccounts() {
  return findAllCorporateAccounts()
}

export async function getAdminCorporateAccount(id: string) {
  if (!id.trim()) {
    throw new AppError(
      'Corporate account ID is required.',
      400,
      'CORPORATE_ACCOUNT_ID_REQUIRED',
    )
  }

  const account = await findAdminCorporateAccountById(id)

  if (!account) {
    throw new AppError(
      'Corporate account not found.',
      404,
      'CORPORATE_ACCOUNT_NOT_FOUND',
    )
  }

  return account
}

export async function getAdminRiderActivity() {
  const rows = await findAdminRiderActivityRows()

  const riders = new Map<
    string,
    {
      riderId: string
      totalRides: number
      completedRides: number
      assignedRides: number
      cancelledRides: number
    }
  >()

  for (const row of rows) {
    if (!row.riderId) {
      continue
    }

    const current = riders.get(row.riderId) ?? {
      riderId: row.riderId,
      totalRides: 0,
      completedRides: 0,
      assignedRides: 0,
      cancelledRides: 0,
    }

    current.totalRides += row._count._all

    if (row.status === 'COMPLETED') {
      current.completedRides += row._count._all
    }

    if (row.status === 'ASSIGNED') {
      current.assignedRides += row._count._all
    }

    if (row.status === 'CANCELLED') {
      current.cancelledRides += row._count._all
    }

    riders.set(row.riderId, current)
  }

  return Array.from(riders.values())
}



export async function getAdminCustomerActivity() {
  const rows = await findAdminCustomerActivityRows()

  const customers = new Map<
    string,
    {
      customerId: string
      totalRides: number
      completedRides: number
      requestedRides: number
      cancelledRides: number
    }
  >()

  for (const row of rows) {
    const current = customers.get(row.customerId) ?? {
      customerId: row.customerId,
      totalRides: 0,
      completedRides: 0,
      requestedRides: 0,
      cancelledRides: 0,
    }

    current.totalRides += row._count._all

    if (row.status === 'COMPLETED') {
      current.completedRides += row._count._all
    }

    if (row.status === 'REQUESTED' || row.status === 'SEARCHING') {
      current.requestedRides += row._count._all
    }

    if (row.status === 'CANCELLED') {
      current.cancelledRides += row._count._all
    }

    customers.set(row.customerId, current)
  }

  return Array.from(customers.values())
}

