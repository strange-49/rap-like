import { AppError } from '../../common/errors/app-error'
import {
  createCorporateAccount,
  createCorporateEmployee,
  findCorporateAccountById,
  findCorporateAccountByTenantId,
  findCorporateEmployeeByEmail,
  findCorporateEmployees,
  findCorporateRides,
  getCorporateBillingSummary,
  getCorporateReportData,
} from './corporate.repository'

export async function createAccount(
  name: string,
  billingEmail?: string,
  tenantId?: string,
) {
  if (!name.trim()) {
    throw new AppError(
      'Corporate account name is required.',
      400,
      'CORPORATE_NAME_REQUIRED',
    )
  }

  return createCorporateAccount({
    name: name.trim(),
    billingEmail:
      billingEmail?.trim() || undefined,
    tenantId:
      tenantId?.trim() || undefined,
  })
}

export async function findAccountForTenant(
  corporateAccountId: string | undefined,
  tenantId: string,
) {
  if (corporateAccountId) {
    const account =
      await findCorporateAccountById(
        corporateAccountId,
      )

    if (
      account &&
      account.tenantId === tenantId
    ) {
      return account
    }

    return null
  }

  return findCorporateAccountByTenantId(tenantId)
}

export async function addEmployee(
  corporateAccountId: string,
  name: string,
  email: string,
  phone?: string,
) {
  if (!corporateAccountId.trim()) {
    throw new AppError(
      'Corporate account ID is required.',
      400,
      'CORPORATE_ACCOUNT_ID_REQUIRED',
    )
  }

  if (!name.trim()) {
    throw new AppError(
      'Employee name is required.',
      400,
      'EMPLOYEE_NAME_REQUIRED',
    )
  }

  if (!email.trim()) {
    throw new AppError(
      'Employee email is required.',
      400,
      'EMPLOYEE_EMAIL_REQUIRED',
    )
  }

  const account =
    await findCorporateAccountById(
      corporateAccountId,
    )

  if (!account) {
    throw new AppError(
      'Corporate account not found.',
      404,
      'CORPORATE_ACCOUNT_NOT_FOUND',
    )
  }

  const existingEmployee =
    await findCorporateEmployeeByEmail(
      email.trim(),
    )

  if (existingEmployee) {
    throw new AppError(
      'An employee with this email already exists.',
      409,
      'EMPLOYEE_EMAIL_ALREADY_EXISTS',
    )
  }

  return createCorporateEmployee({
    name: name.trim(),
    email: email.trim(),
    phone: phone?.trim() || undefined,
    corporateAccount: {
      connect: {
        id: corporateAccountId,
      },
    },
  })
}

export async function listEmployees(
  corporateAccountId: string,
) {
  if (!corporateAccountId.trim()) {
    throw new AppError(
      'Corporate account ID is required.',
      400,
      'CORPORATE_ACCOUNT_ID_REQUIRED',
    )
  }

  const account =
    await findCorporateAccountById(
      corporateAccountId,
    )

  if (!account) {
    throw new AppError(
      'Corporate account not found.',
      404,
      'CORPORATE_ACCOUNT_NOT_FOUND',
    )
  }

  return findCorporateEmployees(
    corporateAccountId,
  )
}

export async function listCorporateRides(
  corporateAccountId: string,
) {
  if (!corporateAccountId.trim()) {
    throw new AppError(
      'Corporate account ID is required.',
      400,
      'CORPORATE_ACCOUNT_ID_REQUIRED',
    )
  }

  const account =
    await findCorporateAccountById(
      corporateAccountId,
    )

  if (!account) {
    throw new AppError(
      'Corporate account not found.',
      404,
      'CORPORATE_ACCOUNT_NOT_FOUND',
    )
  }

  return findCorporateRides(
    corporateAccountId,
  )
}

export async function getBillingSummary(
  corporateAccountId: string,
) {
  if (!corporateAccountId.trim()) {
    throw new AppError(
      'Corporate account ID is required.',
      400,
      'CORPORATE_ACCOUNT_ID_REQUIRED',
    )
  }

  const account =
    await findCorporateAccountById(
      corporateAccountId,
    )

  if (!account) {
    throw new AppError(
      'Corporate account not found.',
      404,
      'CORPORATE_ACCOUNT_NOT_FOUND',
    )
  }

  const payments =
    await getCorporateBillingSummary(
      corporateAccountId,
    )

  const totalAmount = payments.reduce(
    (total, payment) =>
      total + Number(payment.amount),
    0,
  )

  const capturedAmount = payments
    .filter(
      (payment) =>
        payment.status === 'CAPTURED',
    )
    .reduce(
      (total, payment) =>
        total + Number(payment.amount),
      0,
    )

  return {
    corporateAccountId,
    totalPayments: payments.length,
    totalAmount,
    capturedAmount,
    payments,
  }
}

export async function getCorporateReport(
  corporateAccountId: string,
) {
  if (!corporateAccountId.trim()) {
    throw new AppError(
      'Corporate account ID is required.',
      400,
      'CORPORATE_ACCOUNT_ID_REQUIRED',
    )
  }

  const account =
    await findCorporateAccountById(
      corporateAccountId,
    )

  if (!account) {
    throw new AppError(
      'Corporate account not found.',
      404,
      'CORPORATE_ACCOUNT_NOT_FOUND',
    )
  }

  const rides =
    await getCorporateReportData(
      corporateAccountId,
    )

  const completedRides =
    rides.filter(
      (ride) =>
        ride.status === 'COMPLETED',
    )

  const cancelledRides =
    rides.filter(
      (ride) =>
        ride.status === 'CANCELLED',
    )

  const requestedRides =
    rides.filter(
      (ride) =>
        ride.status === 'REQUESTED' ||
        ride.status === 'SEARCHING',
    )

  const totalDistance = rides.reduce(
    (total, ride) =>
      total +
      Number(
        ride.estimatedDistance ?? 0,
      ),
    0,
  )

  const totalEstimatedFare =
    rides.reduce(
      (total, ride) =>
        total +
        Number(
          ride.estimatedFare ?? 0,
        ),
      0,
    )

  const totalFinalFare =
    rides.reduce(
      (total, ride) =>
        total +
        Number(
          ride.finalFare ?? 0,
        ),
      0,
    )

  const totalPayments =
    rides.filter(
      (ride) => ride.payment,
    ).length

  const capturedPayments =
    rides.filter(
      (ride) =>
        ride.payment?.status ===
        'CAPTURED',
    ).length

  const capturedAmount =
    rides.reduce(
      (total, ride) =>
        ride.payment?.status ===
        'CAPTURED'
          ? total +
            Number(
              ride.payment.amount,
            )
          : total,
      0,
    )

  const employeeRideCounts =
    new Map<string, number>()

  for (const ride of rides) {
    employeeRideCounts.set(
      ride.customerId,
      (employeeRideCounts.get(
        ride.customerId,
      ) ?? 0) + 1,
    )
  }

  return {
    corporateAccountId,
    summary: {
      totalRides: rides.length,
      completedRides:
        completedRides.length,
      cancelledRides:
        cancelledRides.length,
      requestedRides:
        requestedRides.length,
      totalDistance,
      totalEstimatedFare,
      totalFinalFare,
      totalPayments,
      capturedPayments,
      capturedAmount,
    },
    employeeRideCounts:
      Array.from(
        employeeRideCounts.entries(),
      ).map(
        ([customerId, rideCount]) => ({
          customerId,
          rideCount,
        }),
      ),
    rides,
  }
}