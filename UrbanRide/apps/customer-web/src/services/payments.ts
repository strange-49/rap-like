import { getToken } from './auth'

const API_BASE_URL = 'http://localhost:3000'

function authHeaders(): HeadersInit {
  const token = getToken()
  if (!token) throw new Error('You must be logged in to manage payment.')
  return { authorization: `Bearer ${token}`, 'content-type': 'application/json' }
}

export type PaymentMode = 'ADVANCE' | 'POST_RIDE'

export interface PaymentOrder {
  id: string
  rideId: string
  amount: number | string
  status: string
  razorpayOrderId: string
}

export interface VerifiedPayment {
  id: string
  rideId: string
  amount: number | string
  status: string
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
}

export async function createPaymentOrder(
  rideId: string,
  mode: PaymentMode,
): Promise<PaymentOrder> {
  const response = await fetch(`${API_BASE_URL}/payments/orders`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      rideId,
      mode,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.error?.message ?? 'Failed to create payment order.',
    )
  }

  return { ...data, amount: Number(data.amount) }
}

export async function verifyPayment(
  paymentId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<VerifiedPayment> {
  const response = await fetch(`${API_BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      paymentId,
      razorpayPaymentId,
      razorpaySignature,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.error?.message ?? 'Payment verification failed.',
    )
  }

  return data
}

export type OutstandingPayment = {
  rideId: string
  paymentStatus: string
  amount: number | string | null
}

export async function getOutstandingPayment(): Promise<OutstandingPayment | null> {
  const response = await fetch(`${API_BASE_URL}/payments/outstanding`, {
    headers: authHeaders(),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message ?? 'Unable to check payment status.')
  return data
}

export async function getRidePaymentStatus(
  rideId: string,
): Promise<{ status: string; amount: number | string } | null> {
  const response = await fetch(
    `${API_BASE_URL}/payments/ride/${encodeURIComponent(rideId)}`,
    { headers: authHeaders() },
  )
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message ?? 'Unable to load payment status.')
  return data
}
