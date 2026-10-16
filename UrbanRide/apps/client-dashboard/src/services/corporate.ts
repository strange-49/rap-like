
import {
  clearClientSession,
  getClientToken,
} from './auth'

const API_BASE_URL = 'http://localhost:3000'

export type CorporateAccount = {
  id: string
  tenantId: string | null
  name: string
  accessCode: string
  billingEmail: string | null
  createdAt: string
  updatedAt: string
}

export type Employee = {
  id: string
  corporateAccountId: string
  name: string
  email: string
  phone: string | null
  active: boolean
  userId?: string | null
  activatedAt?: string | null
  createdAt: string
  updatedAt: string
}

export type CorporateRide = {
  id: string
  customerId: string
  corporateAccountId: string | null
  riderId: string | null
  status: string
  pickupAddress: string
  pickupLatitude: string | number
  pickupLongitude: string | number
  dropAddress: string
  dropLatitude: string | number
  dropLongitude: string | number
  estimatedDistance: string | number | null
  estimatedFare: string | number | null
  finalFare: string | number | null
  requestedAt: string
  assignedAt: string | null
  startedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
}

function redirectToClientLogin() {
  try {
    clearClientSession()

    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('urbanride_client_')) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // Redirect even if browser storage cleanup fails.
  }

  if (window.location.pathname !== '/login') {
    window.location.replace('/login')
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getClientToken()

  if (!token) {
    redirectToClientLogin()
    throw new Error('Your session has expired. Please log in again.')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    redirectToClientLogin()
    throw new Error('Your session has expired. Please log in again.')
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(
      data?.error?.message ?? 'Request failed.',
    )
  }

  return data as T
}

export function getCurrentCorporateAccount() {
  return request<CorporateAccount>(
    '/corporate/accounts/current',
  )
}

export function getEmployees(corporateAccountId: string) {
  return request<Employee[]>(
    `/corporate/accounts/${encodeURIComponent(corporateAccountId)}/employees`,
  )
}

export function addEmployee(
  corporateAccountId: string,
  data: {
    name: string
    email: string
    phone?: string
  },
) {
  return request<{
    employee: Employee
    invitationToken: string
  }>(
    `/corporate/accounts/${encodeURIComponent(corporateAccountId)}/employees`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  )
}

export function getCorporateRides(corporateAccountId: string) {
  return request<CorporateRide[]>(
    `/corporate/accounts/${encodeURIComponent(corporateAccountId)}/rides`,
  )
}

export function getCorporateReport(corporateAccountId: string) {
  return request<{
    corporateAccountId: string
    summary: {
      totalRides: number
      completedRides: number
      cancelledRides: number
      requestedRides: number
      totalDistance: number
      totalEstimatedFare: number
      totalFinalFare: number
      totalPayments: number
      capturedPayments: number
      capturedAmount: number
    }
    employeeRideCounts: Array<{
      customerId: string
      rideCount: number
    }>
    rides: CorporateRide[]
  }>(
    `/corporate/accounts/${encodeURIComponent(corporateAccountId)}/reports`,
  )
}
