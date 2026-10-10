const API_BASE_URL = 'http://localhost:3000'

export type AuthPrincipal = {
  subjectId: string
  role: string
  tenant: {
    tenantId: string
  } | null
}

export type AuthSession = {
  token: string
  expiresAt: string
  principal: AuthPrincipal
  preferences: { rideStartOtpEnabled: boolean } | null
}

export type CurrentSession = {
  principal: AuthPrincipal
  preferences: { rideStartOtpEnabled: boolean } | null
}

const TOKEN_KEY = 'urbanride_token'
const PRINCIPAL_KEY = 'urbanride_principal'
const DARK_MODE_EVENT = 'urbanride:dark-mode-changed'
const SESSION_EVENT = 'urbanride:session-changed'

function otpPreferenceKey(customerId: string) {
  return `urbanride:customer:${customerId}:ride-start-otp`
}

function darkModeKey(customerId: string) {
  return `urbanride:customer:${customerId}:dark-mode`
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getPrincipal(): AuthPrincipal | null {
  const value = localStorage.getItem(PRINCIPAL_KEY)

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as AuthPrincipal
  } catch {
    return null
  }
}

export function saveSession(session: AuthSession): void {
  localStorage.setItem(TOKEN_KEY, session.token)
  localStorage.setItem(
    PRINCIPAL_KEY,
    JSON.stringify(session.principal),
  )
  if (session.preferences) {
    localStorage.setItem(
      otpPreferenceKey(session.principal.subjectId),
      String(session.preferences.rideStartOtpEnabled),
    )
  }
  window.dispatchEvent(new Event(SESSION_EVENT))
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(PRINCIPAL_KEY)
  window.dispatchEvent(new Event(SESSION_EVENT))
}

export async function login(
  username: string,
  password: string,
): Promise<AuthSession> {
  return authenticate('/auth/development/login', username, password)
}

export async function signup(
  username: string,
  password: string,
): Promise<AuthSession> {
  return authenticate('/auth/development/signup', username, password)
}

async function authenticate(
  endpoint: string,
  username: string,
  password: string,
): Promise<AuthSession> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.error?.message ?? 'Authentication failed.',
    )
  }

  const session = data as AuthSession

  saveSession(session)

  return session
}

export async function getCurrentSession(): Promise<CurrentSession> {
  const token = getToken()

  if (!token) {
    throw new Error('Not authenticated.')
  }

  const response = await fetch(
    `${API_BASE_URL}/auth/development/session`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  const data = await response.json()

  if (!response.ok) {
    clearSession()

    throw new Error(
      data?.error?.message ?? 'Authentication session is invalid.',
    )
  }

  const session = data as CurrentSession
  if (session.preferences) {
    localStorage.setItem(
      otpPreferenceKey(session.principal.subjectId),
      String(session.preferences.rideStartOtpEnabled),
    )
  }
  return session
}

export function getDarkModePreference(customerId: string): boolean {
  return localStorage.getItem(darkModeKey(customerId)) === 'true'
}

export function setDarkModePreference(customerId: string, enabled: boolean): void {
  localStorage.setItem(darkModeKey(customerId), String(enabled))
  window.dispatchEvent(new Event(DARK_MODE_EVENT))
}

export async function updateRideStartOtpPreference(enabled: boolean): Promise<boolean> {
  const token = getToken()
  const principal = getPrincipal()
  if (!token || !principal) throw new Error('Customer authentication is required.')
  const response = await fetch(`${API_BASE_URL}/auth/development/session`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rideStartOtpEnabled: enabled }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data?.error?.message ?? 'Unable to save ride-start preference.')
  const saved = Boolean(data.preferences?.rideStartOtpEnabled)
  localStorage.setItem(otpPreferenceKey(principal.subjectId), String(saved))
  return saved
}
