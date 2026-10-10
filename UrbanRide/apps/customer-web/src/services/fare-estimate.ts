import type { RideType } from '../features/rides/ride-types'

export type FareEstimate = {
  distanceInKilometers: number
  durationInMinutes: number
  estimatedFare: number
  vehicleType: RideType
}

const API_BASE_URL = 'http://localhost:3000'

export async function getFareEstimate(
  pickupLatitude: number,
  pickupLongitude: number,
  dropLatitude: number,
  dropLongitude: number,
  vehicleType: RideType,
): Promise<FareEstimate> {
  const params = new URLSearchParams({
    pickupLatitude: String(pickupLatitude),
    pickupLongitude: String(pickupLongitude),
    dropLatitude: String(dropLatitude),
    dropLongitude: String(dropLongitude),
    vehicleType,
  })

  const response = await fetch(
    `${API_BASE_URL}/locations/fare-estimate?${params.toString()}`,
  )

  if (!response.ok) {
    throw new Error(`Fare estimate failed: ${response.status}`)
  }

  return response.json() as Promise<FareEstimate>
}
