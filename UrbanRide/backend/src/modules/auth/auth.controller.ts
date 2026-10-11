import type { IncomingMessage, ServerResponse } from 'node:http'

import { ValidationError } from '../../common/validation/validation-error'
import type { DevelopmentAuthService, CorporateLoginRequest, SignupRequest } from './auth.service'
import type { DevelopmentLoginRequest } from './auth.types'

export interface AuthController {
  login(request: IncomingMessage, response: ServerResponse): Promise<void>
  signup(request: IncomingMessage, response: ServerResponse): Promise<void>
  corporateLogin(request: IncomingMessage, response: ServerResponse): Promise<void>
  activateCorporateEmployee(request: IncomingMessage, response: ServerResponse): Promise<void>
  currentSession(request: IncomingMessage, response: ServerResponse): Promise<void>
  updatePreferences(request: IncomingMessage, response: ServerResponse): Promise<void>
}

export function createAuthController(
  service: DevelopmentAuthService,
): AuthController {
  return {
    async login(request, response) {
      const input = await readLoginRequest(request)
      const session = await service.login(input)

      if (!session) {
        sendJson(response, 401, {
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid credentials.',
          },
        })
        return
      }

      sendJson(response, 200, session)
    },

    async corporateLogin(request, response) {
      const input = await readCorporateLoginRequest(request)
      const session = await service.corporateLogin(input)
      if (!session) {
        sendJson(response, 401, { error: { code: 'CORPORATE_LOGIN_FAILED', message: 'Invalid company code or employee credentials.' } })
        return
      }
      sendJson(response, 200, session)
    },

    async activateCorporateEmployee(request, response) {
      const value = await readJson(request)
      if (!isRecord(value) || typeof value.token !== 'string' || typeof value.password !== 'string') {
        throw new ValidationError('Invitation token and password are required.')
      }
      const result = await service.activateCorporateEmployee(value.token, value.password)
      sendJson(response, 200, { activated: true, employeeId: result.employeeId })
    },

    async signup(request, response) {
      const input = await readSignupRequest(request)
      const session = await service.signup(input)

      if (!session) {
        sendJson(response, 409, {
          error: {
            code: 'USERNAME_ALREADY_EXISTS',
            message: 'Username already exists.',
          },
        })
        return
      }

      sendJson(response, 201, session)
    },

    async currentSession(request, response) {
      const token =
        request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? ''

      const principal = service.authenticate(token)

      if (!principal) {
        sendJson(response, 401, {
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Valid authentication token required.',
          },
        })
        return
      }

      const rideStartOtpEnabled = principal.role === 'CUSTOMER'
        ? await service.getRideStartOtpPreference(principal.subjectId)
        : null
      sendJson(response, 200, {
        principal,
        preferences: rideStartOtpEnabled === null
          ? null
          : { rideStartOtpEnabled },
      })
    },

    async updatePreferences(request, response) {
      const token = request.headers.authorization?.replace(/^Bearer\s+/i, '') ?? ''
      const principal = service.authenticate(token)
      if (!principal) {
        sendJson(response, 401, { error: { code: 'UNAUTHENTICATED', message: 'Valid authentication token required.' } })
        return
      }
      if (principal.role !== 'CUSTOMER') {
        sendJson(response, 403, { error: { code: 'FORBIDDEN', message: 'Customer access is required.' } })
        return
      }
      const value = await readJson(request)
      if (typeof value !== 'object' || value === null || typeof (value as Record<string, unknown>).rideStartOtpEnabled !== 'boolean') {
        throw new ValidationError('rideStartOtpEnabled must be a boolean.')
      }
      const rideStartOtpEnabled = await service.setRideStartOtpPreference(
        principal.subjectId,
        (value as { rideStartOtpEnabled: boolean }).rideStartOtpEnabled,
      )
      if (rideStartOtpEnabled === null) {
        sendJson(response, 401, { error: { code: 'UNAUTHENTICATED', message: 'Customer account is unavailable.' } })
        return
      }
      sendJson(response, 200, { preferences: { rideStartOtpEnabled } })
    },
  }
}

async function readLoginRequest(
  request: IncomingMessage,
): Promise<DevelopmentLoginRequest> {
  const value = await readJson(request)

  if (!isLoginRequest(value)) {
    throw new ValidationError(
      'username and password are required.',
    )
  }

  return value
}

async function readSignupRequest(
  request: IncomingMessage,
): Promise<SignupRequest> {
  const value = await readJson(request)

  if (!isSignupRequest(value)) {
    throw new ValidationError(
      'username and password are required.',
    )
  }

  return value
}

async function readCorporateLoginRequest(request: IncomingMessage): Promise<CorporateLoginRequest> {
  const value = await readJson(request)
  if (!isRecord(value) || typeof value.accessCode !== 'string' || !value.accessCode.trim() || typeof value.email !== 'string' || !value.email.trim() || typeof value.password !== 'string' || !value.password) {
    throw new ValidationError('Company access code, email, and password are required.')
  }
  return { accessCode: value.accessCode, email: value.email, password: value.password }
}

async function readJson(
  request: IncomingMessage,
): Promise<unknown> {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk))
  }

  try {
    return JSON.parse(
      Buffer.concat(chunks).toString('utf8'),
    )
  } catch {
    throw new ValidationError(
      'Request body must be valid JSON.',
    )
  }
}

function isLoginRequest(
  value: unknown,
): value is DevelopmentLoginRequest {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.username === 'string' &&
    candidate.username.trim().length > 0 &&
    typeof candidate.password === 'string' &&
    candidate.password.length > 0
  )
}

function isSignupRequest(value: unknown): value is SignupRequest {
  if (!isRecord(value) || !isLoginRequest(value)) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.fullName === 'string' && candidate.fullName.trim().length >= 2 &&
    typeof candidate.email === 'string' && candidate.email.includes('@') && typeof candidate.username === 'string' && candidate.username.trim().toLowerCase() === candidate.email.trim().toLowerCase() &&
    typeof candidate.phone === 'string' && candidate.phone.trim().length >= 7 &&
    typeof candidate.countryCode === 'string' && candidate.countryCode.startsWith('+')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
): void {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
  })

  response.end(JSON.stringify(body))
}
