import type { RideStatus } from '../../../generated/prisma/client';

import { AppError } from '../../../common/errors/app-error';
import { rideEvents } from '../../../realtime/realtime';
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

export async function requestRide(input: RequestRideInput) {
  const estimatedFare =
    input.estimatedDistance !== undefined
      ? calculateEstimatedFare(input.estimatedDistance)
      : input.estimatedFare;

  const ride = await createRide({
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

  rideEvents.publish('ride.requested', ride.id, {
    customerId: ride.customerId,
    status: ride.status,
  });

  return ride;
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

  const updatedRide = await assignRide(id, riderId);

  rideEvents.publish('ride.assigned', id, {
    riderId,
    status: updatedRide.status,
  });

  return updatedRide;
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

  const updatedRide = await updateRide(id, {
    status: 'DRIVER_ARRIVING',
  });

  rideEvents.publish('ride.driver_arriving', id, {
    riderId: updatedRide.riderId,
    status: updatedRide.status,
  });

  return updatedRide;
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

  const updatedRide = await updateRide(id, {
    status: 'IN_PROGRESS',
    startedAt: new Date(),
  });

  rideEvents.publish('ride.started', id, {
    riderId: updatedRide.riderId,
    status: updatedRide.status,
  });

  return updatedRide;
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

  const updatedRide = await updateRide(id, {
    status: 'COMPLETED',
    completedAt: new Date(),
  });

  rideEvents.publish('ride.completed', id, {
    customerId: updatedRide.customerId,
    riderId: updatedRide.riderId,
    status: updatedRide.status,
  });

  return updatedRide;
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

  const updatedRide = await updateRide(id, {
    status: 'CANCELLED',
    cancellationReason: reason,
    cancelledAt: new Date(),
  });

  rideEvents.publish('ride.cancelled', id, {
    customerId: updatedRide.customerId,
    riderId: updatedRide.riderId,
    reason,
    status: updatedRide.status,
  });

  return updatedRide;
}