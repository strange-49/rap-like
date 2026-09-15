const API_BASE_URL = 'http://localhost:3000'

export interface PaymentOrder {
  id: string
  rideId: string
  amount: number
  status: string
  razorpayOrderId: string
}

export interface VerifiedPayment {
  id: string
  rideId: string
  amount: number
  status: string
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
}

export async function createPaymentOrder(
  rideId: string,
): Promise<PaymentOrder> {
  const response = await fetch(`${API_BASE_URL}/payments/orders`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ rideId }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.error?.message ?? 'Failed to create payment order.',
    )
  }

  return data
}

export async function verifyPayment(
  paymentId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): Promise<VerifiedPayment> {
  const response = await fetch(`${API_BASE_URL}/payments/verify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
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