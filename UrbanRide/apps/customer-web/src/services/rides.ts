import type { RideRequest } from '../features/rides/ride-request'

export async function createRideRequest(
  rideRequest: RideRequest,
): Promise<void> {
  console.log('Creating ride request:', rideRequest)
}
