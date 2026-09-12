import type { RideStatus } from '../../../generated/prisma/client';

import { AppError } from '../../../common/errors/app-error';
import { assertTransition } from './ride.lifecycle';
import { calculateEstimatedFare } from './ride.fare';
import {
  assignRide,
  createRide,
  findRequestedRides,
  findRideById,
  updateRide,
} from './ride.repository';

export interface RequestRideInput {
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

export function requestRide(input: RequestRideInput) {
  const estimatedFare =
    input.estimatedDistance !== undefined
      ? calculateEstimatedFare(input.estimatedDistance)
      : input.estimatedFare;

  return createRide({
    customerId: input.customerId,
    pickupAddress: input.pickupAddress,
    pickupLatitude: input.pickupLatitude,
    pickupLongitude: input.pickupLongitude,
    dropAddress: input.dropAddress,
    dropLatitude: input.dropLatitude,
    dropLongitude: input.dropLongitude,
    estimatedDistance: input.estimatedDistance,
    estimatedFare,
    status: 'REQUESTED',
  });
}

export function getRideById(id: string) {
  return findRideById(id);
}

export function getRequestedRides() {
  return findRequestedRides();
}

export async function transitionRide(
  id: string,
  nextStatus: RideStatus,
) {
  const ride = await findRideById(id);

  if (!ride) {
    throw new AppError(
      'Ride not found.',
      404,
      'RIDE_NOT_FOUND',
    );
  }

  assertTransition(ride.status, nextStatus);

  return updateRide(id, {
    status: nextStatus,
  });
}

export async function assignRider(
  id: string,
  riderId: string,
) {
  const ride = await findRideById(id);

  if (!ride) {
    throw new AppError(
      'Ride not found.',
      404,
      'RIDE_NOT_FOUND',
    );
  }

  assertTransition(ride.status, 'ASSIGNED');

  return assignRide(id, riderId);
}

export async function markDriverArriving(id: string) {
  const ride = await findRideById(id);

  if (!ride) {
    throw new AppError(
      'Ride not found.',
      404,
      'RIDE_NOT_FOUND',
    );
  }

  assertTransition(ride.status, 'DRIVER_ARRIVING');

  return updateRide(id, {
    status: 'DRIVER_ARRIVING',
  });
}

export async function startRide(id: string) {
  const ride = await findRideById(id);

  if (!ride) {
    throw new AppError(
      'Ride not found.',
      404,
      'RIDE_NOT_FOUND',
    );
  }

  assertTransition(ride.status, 'IN_PROGRESS');

  return updateRide(id, {
    status: 'IN_PROGRESS',
    startedAt: new Date(),
  });
}

export async function completeRide(id: string) {
  const ride = await findRideById(id);

  if (!ride) {
    throw new AppError(
      'Ride not found.',
      404,
      'RIDE_NOT_FOUND',
    );
  }

  assertTransition(ride.status, 'COMPLETED');

  return updateRide(id, {
    status: 'COMPLETED',
    completedAt: new Date(),
  });
}

export async function cancelRide(
  id: string,
  reason: 'CUSTOMER' | 'RIDER' | 'SYSTEM',
) {
  const ride = await findRideById(id);

  if (!ride) {
    throw new AppError(
      'Ride not found.',
      404,
      'RIDE_NOT_FOUND',
    );
  }

  assertTransition(ride.status, 'CANCELLED');

  return updateRide(id, {
    status: 'CANCELLED',
    cancellationReason: reason,
    cancelledAt: new Date(),
  });
}