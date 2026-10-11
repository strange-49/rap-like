import type { RideRequest } from '../features/rides/ride-request'
import { getPrincipal, getToken } from './auth'

const API_BASE_URL = 'http://localhost:3000'

export type RideStatus =
  | 'REQUESTED'
  | 'ASSIGNED'
  | 'DRIVER_ARRIVING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export type CreatedRide = {
  id: string
  customerId?: string
  status: RideStatus
  startOtpRequired?: boolean
  estimatedFare: number | null
  finalFare?: number | null
  riderId?: string | null
  rideType?: 'bike' | 'auto' | 'cab' | null
  pickupAddress?: string | null
  dropAddress?: string | null
  pickupLatitude?: number | null
  pickupLongitude?: number | null
  dropLatitude?: number | null
  dropLongitude?: number | null
  estimatedDistance?: number | null
  requestedAt?: string
  assignedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  riderCompletedAt?: string | null
  customerCompletedAt?: string | null
  rating?: { score: number; feedback: string | null } | null
  cancelledAt?: string | null
}

function mapRide(ride: {
  id: string
  customerId?: string
  status: RideStatus
  startOtpRequired?: boolean
  estimatedFare: number | string | null
  finalFare?: number | string | null
  riderId?: string | null
  rideType?: 'bike' | 'auto' | 'cab' | null
  pickupAddress?: string | null
  dropAddress?: string | null
  pickupLatitude?: number | null
  pickupLongitude?: number | null
  dropLatitude?: number | null
  dropLongitude?: number | null
  estimatedDistance?: number | null
  requestedAt?: string
  assignedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  riderCompletedAt?: string | null
  customerCompletedAt?: string | null
  rating?: { score: number; feedback: string | null } | null
  cancelledAt?: string | null
}): CreatedRide {
  return {
    id: ride.id,
    customerId: ride.customerId,
    status: ride.status,
    startOtpRequired: ride.startOtpRequired,
    estimatedFare:
      ride.estimatedFare == null
        ? null
        : Number(ride.estimatedFare),
    finalFare: ride.finalFare == null ? null : Number(ride.finalFare),
    riderId: ride.riderId,
    rideType: ride.rideType ?? null,
    pickupAddress: ride.pickupAddress ?? null,
    dropAddress: ride.dropAddress ?? null,
    pickupLatitude: ride.pickupLatitude ?? null,
    pickupLongitude: ride.pickupLongitude ?? null,
    dropLatitude: ride.dropLatitude ?? null,
    dropLongitude: ride.dropLongitude ?? null,
    estimatedDistance: ride.estimatedDistance ?? null,
    requestedAt: ride.requestedAt,
    assignedAt: ride.assignedAt,
    startedAt: ride.startedAt,
    completedAt: ride.completedAt,
    riderCompletedAt: ride.riderCompletedAt,
    customerCompletedAt: ride.customerCompletedAt,
    rating: ride.rating,
    cancelledAt: ride.cancelledAt,
  }
}

export async function createRideRequest(
  rideRequest: RideRequest,
): Promise<CreatedRide> {
  const principal = getPrincipal()
  const token = getToken()

  if (!principal || !token) {
    throw new Error(
      'You must be logged in to request a ride.',
    )
  }

  const response = await fetch(
    `${API_BASE_URL}/rides`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        pickupAddress: rideRequest.pickup.address,
        pickupLatitude:
          rideRequest.pickup.latitude,
        pickupLongitude:
          rideRequest.pickup.longitude,
        dropAddress: rideRequest.drop.address,
        dropLatitude: rideRequest.drop.latitude,
        dropLongitude:
          rideRequest.drop.longitude,
        rideType: rideRequest.rideType,
      }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Ride request failed: ${response.status} ${errorBody}`,
    )
  }

  const ride =
    (await response.json()) as Parameters<
      typeof mapRide
    >[0]

  return mapRide(ride)
}

export async function getRideById(
  rideId: string,
): Promise<CreatedRide> {
  const token = getToken()

  if (!token) {
    throw new Error(
      'You must be logged in to view the ride.',
    )
  }

  const response = await fetch(
    `${API_BASE_URL}/rides/${encodeURIComponent(
      rideId,
    )}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Unable to load ride: ${response.status} ${errorBody}`,
    )
  }

  const ride =
    (await response.json()) as Parameters<
      typeof mapRide
    >[0]

  return mapRide(ride)
}

export async function getCustomerRides(): Promise<
  CreatedRide[]
> {
  const token = getToken()

  if (!token) {
    throw new Error(
      'You must be logged in to view your rides.',
    )
  }

  const response = await fetch(
    `${API_BASE_URL}/rides/customer`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Unable to load ride history: ${response.status} ${errorBody}`,
    )
  }

  const rides =
    (await response.json()) as Array<
      Parameters<typeof mapRide>[0]
    >

  return rides.map(mapRide)
}

export async function cancelRide(
  rideId: string,
): Promise<CreatedRide> {
  const token = getToken()

  if (!token) {
    throw new Error(
      'You must be logged in to cancel the ride.',
    )
  }

  const response = await fetch(
    `${API_BASE_URL}/rides/${encodeURIComponent(
      rideId,
    )}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        reason: 'CUSTOMER',
      }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()

    throw new Error(
      `Ride cancellation failed: ${response.status} ${errorBody}`,
    )
  }

  const ride =
    (await response.json()) as Parameters<
      typeof mapRide
    >[0]

  return mapRide(ride)
}

export async function confirmRideCompletion(rideId: string): Promise<CreatedRide> {
  const token = getToken()
  if (!token) throw new Error('You must be logged in to confirm this ride.')
  const response = await fetch(`${API_BASE_URL}/rides/${encodeURIComponent(rideId)}/confirm-completion`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message ?? 'Unable to confirm ride completion.')
  return mapRide(data as Parameters<typeof mapRide>[0])
}

export async function getRideStartOtp(rideId: string): Promise<{ otp: string; expiresAt: string }> {
  const token = getToken()
  if (!token) throw new Error('You must be logged in to view the ride start code.')
  const response = await fetch(`${API_BASE_URL}/rides/${encodeURIComponent(rideId)}/start-otp`, {
    headers: { authorization: `Bearer ${token}` },
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error?.message ?? 'Unable to load ride start code.')
  return data
}

export async function rateRide(
  rideId: string,
  score: number,
  feedback: string,
): Promise<void> {
  const token = getToken()
  if (!token) throw new Error('You must be logged in to rate this ride.')
  const response = await fetch(`${API_BASE_URL}/rides/${encodeURIComponent(rideId)}/rating`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ score, feedback }),
  })
  if (!response.ok) {
    const data = await response.json()
    throw new Error(data.error?.message ?? 'Unable to submit rating.')
  }
}
