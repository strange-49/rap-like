import { randomBytes, createHash, scryptSync } from 'node:crypto'
import { AppError } from '../../common/errors/app-error'
import {
  createCorporateAccount,
  createCorporateEmployee,
  findCorporateAccountById,
  findCorporateAccountByTenantId,
  findCorporateAccountByAccessCode,
  registerCorporateAccountWithAdmin,
  findCorporateEmployeeByIdentifier,
  findCorporateEmployeeByEmail,
  findCorporateEmployeeByInvitationTokenHash,
  activateCorporateEmployee,
  findCorporateEmployees,
  findCorporateRides,
  getCorporateBillingSummary,
  getCorporateReportData,
} from './corporate.repository'
import { findUserByEmail, findUserByUsername } from '../auth/auth.repository'

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

  const accessCode = await generateUniqueAccessCode()
  return createCorporateAccount({
    accessCode,
    name: name.trim(),
    billingEmail:
      billingEmail?.trim() || undefined,
    tenantId:
      tenantId?.trim() || undefined,
  })
}

export async function registerCorporateCompany(input: {
  companyName: string
  billingEmail: string
  adminName: string
  adminUsername: string
  adminEmail: string
  password: string
}) {
  const companyName = input.companyName.trim()
  const billingEmail = input.billingEmail.trim().toLowerCase()
  const adminName = input.adminName.trim()
  const adminEmail = input.adminEmail.trim().toLowerCase()
  const adminUsername = input.adminUsername.trim().toLowerCase()

  if (!companyName || !billingEmail.includes('@') || !adminName || !adminEmail.includes('@') || !adminUsername || input.password.length < 8) {
    throw new AppError('Company name, valid company/admin emails, admin name and username, and a password of at least 8 characters are required.', 400, 'CORPORATE_REGISTRATION_INVALID')
  }
  if (adminUsername !== adminEmail) {
    throw new AppError('For company administrator login, use the administrator email as the username.', 400, 'CORPORATE_ADMIN_USERNAME_EMAIL_MISMATCH')
  }
  if (await findUserByUsername(adminUsername) || await findUserByEmail(adminEmail)) {
    throw new AppError('An account already exists with that administrator username or email.', 409, 'CORPORATE_ADMIN_ALREADY_EXISTS')
  }

  const tenantId = `corp_${randomBytes(12).toString('hex')}`
  const accessCode = await generateUniqueAccessCode()
  const adminPasswordHash = scryptSync(input.password, adminUsername, 64).toString('hex')
  try {
    return await registerCorporateAccountWithAdmin({
      name: companyName, billingEmail, accessCode, tenantId,
      adminUsername, adminEmail, adminPasswordHash, adminName,
    })
  } catch (error) {
    // Unique constraints may be hit concurrently; never return a partial account.
    throw new AppError('Company registration could not be completed. Check that the administrator email and username are unique, then try again.', 409, 'CORPORATE_REGISTRATION_CONFLICT')
  }
}

async function generateUniqueAccessCode(): Promise<string> {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const bytes = randomBytes(4)
    let code = ''
    for (const byte of bytes) code += alphabet[byte % alphabet.length]
    if (!(await findCorporateAccountByAccessCode(code))) return code
  }
  throw new AppError('Unable to generate a unique company access code. Please try again.', 503, 'ACCESS_CODE_GENERATION_FAILED')
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

  const normalizedEmail = email.trim().toLowerCase()
  const invitationToken = randomBytes(32).toString('hex')
  const invitationTokenHash = createHash('sha256').update(invitationToken).digest('hex')
  const employee = await createCorporateEmployee({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone?.trim() || undefined,
    invitationTokenHash,
    invitationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    corporateAccount: { connect: { id: corporateAccountId } },
  })
  return {
    employee: {
      id: employee.id,
      corporateAccountId: employee.corporateAccountId,
      name: employee.name,
      email: employee.email,
      phone: employee.phone,
      active: employee.active,
      activatedAt: employee.activatedAt,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    },
    invitationToken,
  }
}

export async function activateEmployeeInvitation(token: string, password: string) {
  if (!token || token.length < 32 || password.length < 8) {
    throw new AppError('A valid invitation and a password of at least 8 characters are required.', 400, 'INVALID_INVITATION_INPUT')
  }
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const employee = await findCorporateEmployeeByInvitationTokenHash(tokenHash)
  if (!employee) {
    throw new AppError('This invitation is invalid, expired, or already used.', 400, 'INVITATION_INVALID')
  }
  const username = employee.email.trim().toLowerCase()
  const existing = await findUserByEmail(username) ?? await findUserByUsername(username)
  if (existing) {
    throw new AppError('An account already exists for this email. Contact your company administrator.', 409, 'EMPLOYEE_ACCOUNT_EXISTS')
  }
  const passwordHash = hashPassword(password, username)
  const activation = await activateCorporateEmployee({
    employeeId: employee.id,
    invitationTokenHash: tokenHash,
    username,
    passwordHash,
    fullName: employee.name,
    email: username,
    phone: employee.phone,
    countryCode: null,
  })
  if (!activation) throw new AppError('This invitation is invalid, expired, or already used.', 400, 'INVITATION_INVALID')
  return activation
}

export async function authenticateCorporateEmployee(accessCode: string, identifier: string) {
  const normalizedCode = accessCode.trim().toUpperCase()
  if (!/^[A-Z0-9]{4}$/.test(normalizedCode)) return null
  const account = await findCorporateAccountByAccessCode(normalizedCode)
  if (!account) return null
  const employee = await findCorporateEmployeeByIdentifier(identifier.trim().toLowerCase())
  if (!employee || !employee.active || !employee.userId || employee.corporateAccountId !== account.id) return null
  return { account, employee }
}

function hashPassword(password: string, username: string): string {
  return requireScrypt(password, username)
}

function requireScrypt(password: string, username: string): string {
  // Keep the same password-hash format as the existing development auth service.
  return scryptSync(password, username, 64).toString('hex')
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