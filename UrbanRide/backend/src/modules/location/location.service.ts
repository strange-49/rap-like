const EARTH_RADIUS_KILOMETERS = 6371;

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export function calculateDistance(
  from: Coordinates,
  to: Coordinates,
): number {
  validateCoordinates(from);
  validateCoordinates(to);

  const latitudeDifference = toRadians(
    to.latitude - from.latitude,
  );

  const longitudeDifference = toRadians(
    to.longitude - from.longitude,
  );

  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);

  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDifference / 2) ** 2;

  const angularDistance =
    2 * Math.atan2(
      Math.sqrt(haversine),
      Math.sqrt(1 - haversine),
    );

  return Math.round(
    EARTH_RADIUS_KILOMETERS * angularDistance * 100,
  ) / 100;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function validateCoordinates(coordinates: Coordinates): void {
  if (
    !Number.isFinite(coordinates.latitude) ||
    coordinates.latitude < -90 ||
    coordinates.latitude > 90
  ) {
    throw new Error('Latitude must be between -90 and 90.');
  }

  if (
    !Number.isFinite(coordinates.longitude) ||
    coordinates.longitude < -180 ||
    coordinates.longitude > 180
  ) {
    throw new Error('Longitude must be between -180 and 180.');
  }
}