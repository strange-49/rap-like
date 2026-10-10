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

export interface DevelopmentAuthService {
  login(input: DevelopmentLoginRequest): Promise<DevelopmentSession | null>
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
      const user = await findUserByUsername(input.username)

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

      return createSession(user.id, user.role, user.tenantId, user.rideStartOtpEnabled)
    },

    async signup(input: SignupRequest) {
      const existingUser = await findUserByUsername(input.username)

      if (existingUser) {
        return null
      }

      const passwordHash = hashPassword(
        input.password,
        input.username,
      )

      const user = await createUser({
        username: input.username,
        passwordHash,
        role: 'CUSTOMER',
        tenantId: null,
      })

      return createSession(user.id, user.role, user.tenantId, user.rideStartOtpEnabled)
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
  ): DevelopmentSession {
    const token = randomBytes(32).toString('hex')
    const expiresAt = Date.now() + sessionLifetimeMs

    const principal: AuthContext = {
      subjectId: userId,
      role,
      tenant: tenantId
        ? { tenantId }
        : null,
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
