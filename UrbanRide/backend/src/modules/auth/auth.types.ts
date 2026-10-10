import type { AuthContext } from '../../common/auth/auth-context'
import type { PlatformRole } from '../../common/authorization/roles'

export interface LoginRequest {
  username: string
  password: string
}

export interface SignupRequest {
  username: string
  password: string
  role: PlatformRole
  tenantId?: string | null
}

export interface AuthSession {
  token: string
  expiresAt: string
  principal: AuthContext
}

/**
 * Temporary compatibility types for the existing development authentication.
 * These will be removed after real authentication is fully wired.
 */
export interface DevelopmentLoginRequest {
  username: string
  password: string
}

export interface DevelopmentTestUser {
  username: string
  password: string
  role: PlatformRole
  tenantId: string | null
}

export interface DevelopmentSession {
  token: string
  expiresAt: string
  principal: AuthContext
  preferences: { rideStartOtpEnabled: boolean } | null
}
