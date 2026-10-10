const API_BASE_URL = 'http://localhost:3000'

const TOKEN_KEY = 'urbanride_client_token'
const PRINCIPAL_KEY = 'urbanride_client_principal'

export type ClientPrincipal = {
  subjectId: string
  role: 'CLIENT_ADMIN'
  tenant: {
    tenantId: string
  } | null
}

export type ClientSession = {
  token: string
  expiresAt: string
  principal: ClientPrincipal
}

export async function loginClient(
  username: string,
  password: string,
): Promise<ClientSession> {
  const response = await fetch(
    `${API_BASE_URL}/auth/development/login`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    },
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data?.error?.message ??
        'Client login failed.',
    )
  }

  if (data.principal?.role !== 'CLIENT_ADMIN') {
    throw new Error(
      'This account is not a Client Admin account.',
    )
  }

  const session: ClientSession = {
    token: data.token,
    expiresAt: data.expiresAt,
    principal: data.principal,
  }

  localStorage.setItem(
    TOKEN_KEY,
    session.token,
  )

  localStorage.setItem(
    PRINCIPAL_KEY,
    JSON.stringify(session.principal),
  )

  return session
}

export function getClientToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function getClientPrincipal():
  | ClientPrincipal
  | null {
  const value =
    localStorage.getItem(PRINCIPAL_KEY)

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as ClientPrincipal
  } catch {
    return null
  }
}

export function clearClientSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(PRINCIPAL_KEY)
}

export function isClientAuthenticated() {
  return Boolean(getClientToken())
}