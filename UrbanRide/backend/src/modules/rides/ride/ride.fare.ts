const BASE_FARE = 30;
const PER_KILOMETER_RATE = 15;

export function calculateEstimatedFare(distanceInKilometers: number): number {
  if (!Number.isFinite(distanceInKilometers) || distanceInKilometers < 0) {
    throw new Error('Distance must be a non-negative number.');
  }

  const fare = BASE_FARE + distanceInKilometers * PER_KILOMETER_RATE;

  return Math.round(fare * 100) / 100;
}