import type { RideType } from './ride-types'

export type LocationSelection = {
  address: string
  latitude: number
  longitude: number
}

export type RideRequest = {
  pickup: LocationSelection
  drop: LocationSelection
  rideType: RideType
}
