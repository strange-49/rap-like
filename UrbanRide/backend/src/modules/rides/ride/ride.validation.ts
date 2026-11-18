import { AppError } from '../../../common/errors/app-error';

export type RideVehicleType = 'bike' | 'auto' | 'cab';

export interface ValidatedRequestRideInput {
  corporateAccountId?: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropAddress: string;
  dropLatitude: number;
  dropLongitude: number;
  rideType: RideVehicleType;
  estimatedDistance?: number;
  estimatedFare?: number;
}

export type CancellationReason = 'CUSTOMER' | 'RIDER' | 'SYSTEM';

export function validateRequestRideInput(
  input: unknown,
): ValidatedRequestRideInput {
  if (!isRecord(input)) {
    throw new AppError(
      'Request body must be a JSON object.',
      400,
      'INVALID_REQUEST_BODY',
    );
  }

  const corporateAccountId =
    input.corporateAccountId === undefined
      ? undefined
      : requireString(input.corporateAccountId, 'corporateAccountId');

  const pickupAddress = requireString(input.pickupAddress, 'pickupAddress');

  const pickupLatitude = requireNumber(
    input.pickupLatitude,
    'pickupLatitude',
  );

  const pickupLongitude = requireNumber(
    input.pickupLongitude,
    'pickupLongitude',
  );

  const dropAddress = requireString(input.dropAddress, 'dropAddress');

  const dropLatitude = requireNumber(
    input.dropLatitude,
    'dropLatitude',
  );

  const dropLongitude = requireNumber(
    input.dropLongitude,
    'dropLongitude',
  );

  const rideType = requireRideType(input.rideType);

  const estimatedDistance =
    input.estimatedDistance === undefined
      ? undefined
      : requireNumber(
          input.estimatedDistance,
          'estimatedDistance',
        );

  const estimatedFare =
    input.estimatedFare === undefined
      ? undefined
      : requireNumber(
          input.estimatedFare,
          'estimatedFare',
        );

  validateLatitude(pickupLatitude, 'pickupLatitude');
  validateLongitude(pickupLongitude, 'pickupLongitude');
  validateLatitude(dropLatitude, 'dropLatitude');
  validateLongitude(dropLongitude, 'dropLongitude');

  if (pickupAddress.length > 300 || dropAddress.length > 300) {
    throw new AppError('Ride addresses must be 300 characters or fewer.', 400, 'ADDRESS_TOO_LONG');
  }
  if (pickupLatitude === dropLatitude && pickupLongitude === dropLongitude) {
    throw new AppError('Pickup and drop locations must be different.', 400, 'PICKUP_EQUALS_DROP');
  }

  if (estimatedDistance !== undefined && estimatedDistance < 0) {
    throw new AppError(
      'estimatedDistance cannot be negative.',
      400,
      'INVALID_ESTIMATED_DISTANCE',
    );
  }

  if (estimatedFare !== undefined && estimatedFare < 0) {
    throw new AppError(
      'estimatedFare cannot be negative.',
      400,
      'INVALID_ESTIMATED_FARE',
    );
  }

  return {
    corporateAccountId,
    pickupAddress,
    pickupLatitude,
    pickupLongitude,
    dropAddress,
    dropLatitude,
    dropLongitude,
    rideType,
    estimatedDistance,
    estimatedFare,
  };
}

export interface ValidatedLocationReport {
  latitude: number;
  longitude: number;
  heading: number | null;
  speedKmh: number | null;
}

export function validateLocationReport(input: unknown): ValidatedLocationReport {
  if (!isRecord(input)) throw new AppError('Location body must be an object.', 400, 'INVALID_LOCATION');
  const latitude = requireNumber(input.latitude, 'latitude');
  const longitude = requireNumber(input.longitude, 'longitude');
  validateLatitude(latitude, 'latitude');
  validateLongitude(longitude, 'longitude');
  const heading = input.heading === undefined || input.heading === null ? null : requireNumber(input.heading, 'heading');
  const speedKmh = input.speedKmh === undefined || input.speedKmh === null ? null : requireNumber(input.speedKmh, 'speedKmh');
  if (heading !== null && (heading < 0 || heading > 360)) throw new AppError('heading must be between 0 and 360.', 400, 'INVALID_LOCATION');
  if (speedKmh !== null && (speedKmh < 0 || speedKmh > 300)) throw new AppError('speedKmh must be between 0 and 300.', 400, 'INVALID_LOCATION');
  return { latitude, longitude, heading, speedKmh };
}

export function validateCancellationReason(
  input: unknown,
): CancellationReason {
  if (!isRecord(input)) {
    throw new AppError(
      'Request body must be a JSON object.',
      400,
      'INVALID_REQUEST_BODY',
    );
  }

  if (
    input.reason !== 'CUSTOMER' &&
    input.reason !== 'RIDER' &&
    input.reason !== 'SYSTEM'
  ) {
    throw new AppError(
      'reason must be CUSTOMER, RIDER, or SYSTEM.',
      400,
      'INVALID_CANCELLATION_REASON',
    );
  }

  return input.reason;
}

function requireRideType(value: unknown): RideVehicleType {
  if (value !== 'bike' && value !== 'auto' && value !== 'cab') {
    throw new AppError(
      'rideType must be bike, auto, or cab.',
      400,
      'INVALID_RIDE_TYPE',
    );
  }

  return value;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requireString(
  value: unknown,
  field: string,
): string {
  if (
    typeof value !== 'string' ||
    value.trim().length === 0
  ) {
    throw new AppError(
      `${field} must be a non-empty string.`,
      400,
      'INVALID_RIDE_INPUT',
    );
  }

  return value.trim();
}

function requireNumber(
  value: unknown,
  field: string,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    throw new AppError(
      `${field} must be a valid number.`,
      400,
      'INVALID_RIDE_INPUT',
    );
  }

  return value;
}

function validateLatitude(
  value: number,
  field: string,
): void {
  if (value < -90 || value > 90) {
    throw new AppError(
      `${field} must be between -90 and 90.`,
      400,
      'INVALID_COORDINATE',
    );
  }
}

function validateLongitude(
  value: number,
  field: string,
): void {
  if (value < -180 || value > 180) {
    throw new AppError(
      `${field} must be between -180 and 180.`,
      400,
      'INVALID_COORDINATE',
    );
  }
}
