export type RideVehicleType = 'bike' | 'auto' | 'cab'

const FARE_RULES: Record<
  RideVehicleType,
  {
    baseFare: number
    perKilometer: number
  }
> = {
  bike: {
    baseFare: 30,
    perKilometer: 10,
  },
  auto: {
    baseFare: 40,
    perKilometer: 15,
  },
  cab: {
    baseFare: 60,
    perKilometer: 20,
  },
}

export function calculateEstimatedFare(
  distanceInKilometers: number,
  vehicleType: RideVehicleType,
): number {
  if (
    !Number.isFinite(distanceInKilometers) ||
    distanceInKilometers < 0
  ) {
    throw new Error('Distance must be a non-negative number.')
  }

  const rule = FARE_RULES[vehicleType]

  if (!rule) {
    throw new Error('Invalid vehicle type.')
  }

  const fare =
    rule.baseFare +
    distanceInKilometers * rule.perKilometer

  return Math.round(fare * 100) / 100
}
