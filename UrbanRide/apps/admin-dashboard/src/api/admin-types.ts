export type AdminOverview = {
  rides: { total: number; byStatus: Record<string, number> }
  payments: { total: number; capturedAmount: number | string }
  corporate: { accounts: number; employees: number }
  rider: { deviceTokens: number }
}
export type AdminRide = {
  id: string
  status: string
  pickupAddress?: string | null
  dropAddress?: string | null
  estimatedFare?: number | string | null
  requestedAt?: string | null
  createdAt?: string | null
  customerId?: string | null
  riderId?: string | null
}
export type AdminPayment = {
  id: string
  status: string
  amount: number | string
  createdAt?: string | null
  rideId?: string | null
  currency?: string | null
}
