import type { RideType } from './ride-types'

export type RideRequest = {
  pickup: string
  drop: string
  rideType: RideType
}
