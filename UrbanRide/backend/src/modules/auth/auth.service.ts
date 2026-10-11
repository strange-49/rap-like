import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto'

import type { AuthContext } from '../../common/auth/auth-context'
import {
  findUserByUsername,
  findUserById,
  updateUserRideStartOtpPreference,
  createUser,
} from './auth.repository'
import type {
  DevelopmentLoginRequest,
  DevelopmentSession,
} from './auth.types'
import { authenticateCorporateEmployee, activateEmployeeInvitation } from '../corporate/corporate.service'

export interface DevelopmentAuthService {
  login(input: DevelopmentLoginRequest): Promise<DevelopmentSession | null>
  corporateLogin(input: CorporateLoginRequest): Promise<DevelopmentSession | null>
  activateCorporateEmployee(token: string, password: string): Promise<{ employeeId: string }>
  signup(
    input: SignupRequest,
  ): Promise<DevelopmentSession | null>
  authenticate(token: string): AuthContext | null
  getRideStartOtpPreference(customerId: string): Promise<boolean | null>
  setRideStartOtpPreference(customerId: string, enabled: boolean): Promise<boolean | null>
}

export interface SignupRequest {
  username: string
  password: string
  fullName: string
  email: string
  phone: string
  countryCode: string
}

export interface CorporateLoginRequest {
  accessCode: string
  email: string
  password: string
}

const sessionLifetimeMs = 8 * 60 * 60 * 1000

export function createDevelopmentAuthService(): DevelopmentAuthService {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Development authentication must not run in production.')
  }

  const sessions = new Map<
    string,
    {
      expiresAt: number
      principal: AuthContext
    }
  >()

  return {
    async login(input: DevelopmentLoginRequest) {
      const user = await findUserByUsername(input.username.trim().toLowerCase())

      if (!user || !user.active) {
        return null
      }

      if (
        !passwordMatches(
          input.password,
          user.username,
          user.passwordHash,
        )
      ) {
        return null
      }

      return createSession(user.id, user.role, user.tenantId, user.rideStartOtpEnabled, {
        fullName: user.fullName, email: user.email, phone: user.phone, countryCode: user.countryCode,
      })
    },

    async signup(input: SignupRequest) {
      const normalizedUsername = input.username.trim().toLowerCase()
      const existingUser = await findUserByUsername(normalizedUsername)

      if (existingUser) {
        return null
      }

      const passwordHash = hashPassword(
        input.password,
        normalizedUsername,
      )

      const user = await createUser({
        username: normalizedUsername,
        passwordHash,
        role: 'CUSTOMER',
        tenantId: null,
        fullName: input.fullName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone.trim(),
        countryCode: input.countryCode.trim(),
      })

      return createSession(user.id, user.role, user.tenantId, user.rideStartOtpEnabled, {
        fullName: user.fullName, email: user.email, phone: user.phone, countryCode: user.countryCode,
      })
    },

    async corporateLogin(input: CorporateLoginRequest) {
      const membership = await authenticateCorporateEmployee(input.accessCode, input.email)
      if (!membership) return null
      const user = await findUserById(membership.employee.userId!)
      if (!user || !user.active || !passwordMatches(input.password, user.username, user.passwordHash)) return null
      return createSession(user.id, user.role, user.tenantId, user.rideStartOtpEnabled, {
        fullName: user.fullName, email: user.email, phone: user.phone, countryCode: user.countryCode,
        corporateAccountId: membership.account.id, corporateAccountName: membership.account.name,
      })
    },

    async activateCorporateEmployee(token: string, password: string) {
      const activation = await activateEmployeeInvitation(token, password)
      return { employeeId: activation.user.id }
    },

    async getRideStartOtpPreference(customerId: string) {
      const user = await findUserById(customerId)
      return user?.rideStartOtpEnabled ?? null
    },

    async setRideStartOtpPreference(customerId: string, enabled: boolean) {
      const result = await updateUserRideStartOtpPreference(customerId, enabled)
      return result.rideStartOtpEnabled
    },

    authenticate(token: string) {
      const session = sessions.get(token)

      if (!session || session.expiresAt <= Date.now()) {
        sessions.delete(token)
        return null
      }

      return session.principal
    },
  }

  function createSession(
    userId: string,
    role: AuthContext['role'],
    tenantId: string | null,
    rideStartOtpEnabled: boolean,
    profile: Partial<AuthContext> = {},
  ): DevelopmentSession {
    const token = randomBytes(32).toString('hex')
    const expiresAt = Date.now() + sessionLifetimeMs

    const principal: AuthContext = {
      subjectId: userId,
      role,
      tenant: tenantId ? { tenantId } : null,
      ...profile,
    }

    sessions.set(token, {
      expiresAt,
      principal,
    })

    return {
      token,
      expiresAt: new Date(expiresAt).toISOString(),
      principal,
      preferences: role === 'CUSTOMER' ? { rideStartOtpEnabled } : null,
    }
  }
}

function hashPassword(
  password: string,
  username: string,
): string {
  return scryptSync(
    password,
    username,
    64,
  ).toString('hex')
}

function passwordMatches(
  password: string,
  username: string,
  storedHash: string,
): boolean {
  const expected = Buffer.from(
    storedHash,
    'hex',
  )

  const actual = scryptSync(
    password,
    username,
    expected.length,
  )

  return timingSafeEqual(
    expected,
    actual,
  )
}
