import { AppError } from '../../../common/errors/app-error';

export interface ValidatedRequestRideInput {
  customerId: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropAddress: string;
  dropLatitude: number;
  dropLongitude: number;
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

  const customerId = requireString(input.customerId, 'customerId');
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
  const dropLatitude = requireNumber(input.dropLatitude, 'dropLatitude');
  const dropLongitude = requireNumber(
    input.dropLongitude,
    'dropLongitude',
  );

  const estimatedDistance =
    input.estimatedDistance === undefined
      ? undefined
      : requireNumber(input.estimatedDistance, 'estimatedDistance');

  const estimatedFare =
    input.estimatedFare === undefined
      ? undefined
      : requireNumber(input.estimatedFare, 'estimatedFare');

  validateLatitude(pickupLatitude, 'pickupLatitude');
  validateLongitude(pickupLongitude, 'pickupLongitude');
  validateLatitude(dropLatitude, 'dropLatitude');
  validateLongitude(dropLongitude, 'dropLongitude');

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
    customerId,
    pickupAddress,
    pickupLatitude,
    pickupLongitude,
    dropAddress,
    dropLatitude,
    dropLongitude,
    estimatedDistance,
    estimatedFare,
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AppError(
      `${field} must be a non-empty string.`,
      400,
      'INVALID_RIDE_INPUT',
    );
  }

  return value.trim();
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new AppError(
      `${field} must be a valid number.`,
      400,
      'INVALID_RIDE_INPUT',
    );
  }

  return value;
}

function validateLatitude(value: number, field: string): void {
  if (value < -90 || value > 90) {
    throw new AppError(
      `${field} must be between -90 and 90.`,
      400,
      'INVALID_COORDINATE',
    );
  }
}

function validateLongitude(value: number, field: string): void {
  if (value < -180 || value > 180) {
    throw new AppError(
      `${field} must be between -180 and 180.`,
      400,
      'INVALID_COORDINATE',
    );
  }
}