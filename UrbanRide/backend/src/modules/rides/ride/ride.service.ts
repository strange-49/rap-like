import type { RideStatus } from '../../../generated/prisma/client';
import crypto from 'node:crypto';

import { AppError } from '../../../common/errors/app-error';
import { rideEvents } from '../../../realtime/realtime';
import { enqueue } from '../../../jobs/queue';
import { startOtpFailuresByRide, startOtpIssuesByRide } from '../../../common/security/limiters';
import { locationUpdatesByRider } from '../../../common/security/limiters';
import { riderLocations, type RiderLocation } from '../../../realtime/rider-locations';
import { getRiderAvailability } from '../../notifications/rider-availability.repository';
import { getDrivingRoute } from '../../location/map.service';
import { assertTransition, predecessorsOf } from './ride.lifecycle';
import { calculateEstimatedFare } from './ride.fare';
import { findUserById } from '../../auth/auth.repository';
import {
  assignRideToRiderIfAvailable,
  createRide,
  findActiveCustomerRide,
  findActiveRiderRide,
  findRiderRideHistory,
  findCustomerOutstandingPayment,
  findCustomerRides,
  findRequestedRides,
  findRideById,
  updateRide,
  updateRideStatusIfCurrent,
  recordCompletionConfirmation,
  createRideRating,
  saveRideStartOtp,
  findRideStartOtp,
  consumeRideStartOtp,
} from './ride.repository';

export interface RequestRideInput {
  customerId: string;
  corporateAccountId?: string;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropAddress: string;
  dropLatitude: number;
  dropLongitude: number;
  rideType: 'bike' | 'auto' | 'cab';
  estimatedDistance?: number;
  estimatedFare?: number;
}

export async function requestRide(
  input: RequestRideInput,
) {
  const outstandingPayment = await findCustomerOutstandingPayment(
    input.customerId,
  );
  if (outstandingPayment) {
    throw new AppError(
      'Please settle the payment for your completed ride before booking again.',
      409,
      'OUTSTANDING_PAYMENT',
    );
  }

  const activeRide =
    await findActiveCustomerRide(
      input.customerId,
    );

  if (activeRide) {
    throw new AppError(
      'You already have an active ride.',
      409,
      'ACTIVE_RIDE_EXISTS',
    );
  }

  const route =
    await getDrivingRoute(
      {
        latitude:
          input.pickupLatitude,
        longitude:
          input.pickupLongitude,
      },
      {
        latitude:
          input.dropLatitude,
        longitude:
          input.dropLongitude,
      },
    );

  const estimatedDistance =
    route.distanceInKilometers;

  const estimatedFare =
    calculateEstimatedFare(
      estimatedDistance,
      input.rideType,
    );

  const customer = await findUserById(input.customerId);

  const ride = await createRide({
    customerId: input.customerId,
    ...(input.corporateAccountId
      ? {
          corporateAccount: {
            connect: {
              id: input.corporateAccountId,
            },
          },
        }
      : {}),
    pickupAddress:
      input.pickupAddress,
    pickupLatitude:
      input.pickupLatitude,
    pickupLongitude:
      input.pickupLongitude,
    dropAddress:
      input.dropAddress,
    dropLatitude:
      input.dropLatitude,
    dropLongitude:
      input.dropLongitude,
    estimatedDistance,
    estimatedFare,
    startOtpRequired: customer?.rideStartOtpEnabled ?? true,
    status: 'REQUESTED',
  });

  await rideEvents.publish(
    'ride.requested',
    ride.id,
    {
      customerId:
        ride.customerId,
      corporateAccountId: input.corporateAccountId,
      pickupAddress:
        ride.pickupAddress,
      pickupLatitude:
        ride.pickupLatitude,
      pickupLongitude:
        ride.pickupLongitude,
      dropAddress:
        ride.dropAddress,
      dropLatitude:
        ride.dropLatitude,
      dropLongitude:
        ride.dropLongitude,
      rideType:
        input.rideType,
      status:
        ride.status,
      estimatedDistance,
      estimatedFare,
      durationInMinutes:
        route.durationInMinutes,
    },
  );

  return ride;
}

export function getRideById(
  id: string,
) {
  return findRideById(id);
}

export async function reportIdleRiderLocation(riderId: string, point: { latitude: number; longitude: number; heading?: number | null; speedKmh?: number | null }): Promise<RiderLocation> {
  validateLocationPoint(point);
  await locationUpdatesByRider.enforce(`rider:${riderId}`);
  if (await getRiderAvailability(riderId) !== true) {
    throw new AppError('Rider must be online to report an idle location.', 409, 'RIDER_NOT_ONLINE');
  }
  const location = riderLocations.set(riderId, point, point);
  await riderLocations.publishShared(location);
  return location;
}

export async function reportRideLocation(rideId: string, riderId: string, point: { latitude: number; longitude: number; heading?: number | null; speedKmh?: number | null }): Promise<RiderLocation> {
  validateLocationPoint(point);
  await locationUpdatesByRider.enforce(`rider:${riderId}`);
  const ride = await findRideById(rideId);
  if (!ride || ride.riderId !== riderId || !['ASSIGNED', 'DRIVER_ARRIVING', 'IN_PROGRESS'].includes(ride.status)) {
    throw new AppError('Only the assigned rider can report location for an active ride.', 403, 'FORBIDDEN');
  }
  const location = riderLocations.set(riderId, point, point);
  await riderLocations.publishShared(location);
  await rideEvents.publish('ride.location', rideId, {
    riderId,
    customerId: ride.customerId,
    corporateAccountId: ride.corporateAccountId,
    location,
  });
  return location;
}

export async function getAssignedRiderLocation(rideId: string) {
  const ride = await findRideById(rideId);
  if (!ride || !ride.riderId || !['ASSIGNED', 'DRIVER_ARRIVING', 'IN_PROGRESS'].includes(ride.status)) return null;
  return riderLocations.getFresh(ride.riderId);
}

function validateLocationPoint(point: { latitude: number; longitude: number }): void {
  if (!Number.isFinite(point.latitude) || point.latitude < -90 || point.latitude > 90 ||
      !Number.isFinite(point.longitude) || point.longitude < -180 || point.longitude > 180) {
    throw new AppError('Latitude and longitude are invalid.', 400, 'INVALID_LOCATION');
  }
}

export async function getCustomerStartOtp(rideId: string, customerId: string) {
  await startOtpIssuesByRide.enforce(`ride:${rideId}`, 'Too many ride start code requests. Try again later.');
  const ride = await findRideById(rideId);
  if (!ride || ride.customerId !== customerId || !ride.startOtpRequired || !['ASSIGNED', 'DRIVER_ARRIVING'].includes(ride.status)) {
    throw new AppError('Start code is unavailable for this ride.', 404, 'START_CODE_UNAVAILABLE');
  }
  const otp = String(crypto.randomInt(100000, 1000000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await saveRideStartOtp(
    rideId,
    crypto.createHash('sha256').update(otp).digest('hex'),
    expiresAt,
  );
  return { otp, expiresAt };
}

export function getCustomerRides(
  customerId: string,
) {
  return findCustomerRides(
    customerId,
  );
}

export function getRequestedRides() {
  return findRequestedRides();
}

export function getRiderActiveRide(riderId: string) {
  return findActiveRiderRide(riderId);
}

export function getRiderHistory(riderId: string) {
  return findRiderRideHistory(riderId);
}

export async function rateCompletedRide(
  rideId: string,
  customerId: string,
  score: number,
  feedback?: string,
) {
  const ride = await findRideById(rideId);
  if (!ride || ride.status !== 'COMPLETED' || ride.customerId !== customerId || !ride.riderId) {
    throw new AppError('Only your completed rides can be rated.', 403, 'RIDE_NOT_RATEABLE');
  }
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new AppError('Rating must be an integer from 1 to 5.', 400, 'INVALID_RATING');
  }
  const normalizedFeedback = feedback?.trim();
  if (normalizedFeedback && normalizedFeedback.length > 1000) {
    throw new AppError('Feedback must be 1000 characters or fewer.', 400, 'FEEDBACK_TOO_LONG');
  }
  try {
    return await createRideRating({
      ride: { connect: { id: rideId } },
      customerId,
      riderId: ride.riderId,
      score,
      feedback: normalizedFeedback || null,
    });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      throw new AppError('This ride has already been rated.', 409, 'RATING_ALREADY_EXISTS');
    }
    throw error;
  }
}

export function getCustomerOutstandingPayment(customerId: string) {
  return findCustomerOutstandingPayment(customerId);
}

export async function transitionRide(
  id: string,
  nextStatus: RideStatus,
) {
  if (nextStatus === 'COMPLETED') {
    throw new AppError(
      'A ride can only be completed after both parties confirm completion.',
      409,
      'COMPLETION_CONFIRMATIONS_REQUIRED',
    );
  }

  const ride =
    await findRideById(id);

  if (!ride) {
    throw new AppError(
      'Ride not found.',
      404,
      'RIDE_NOT_FOUND',
    );
  }

  assertTransition(
    ride.status,
    nextStatus,
  );

  const updatedRide = await updateRideStatusIfCurrent(id, nextStatus, predecessorsOf(nextStatus));
  if (!updatedRide) {
    throw new AppError('Ride status changed before this update could be applied.', 409, 'RIDE_STATE_CONFLICT');
  }

  const eventType =
    getRideEventType(nextStatus);

  await rideEvents.publish(
    eventType,
    id,
    {
      customerId:
        updatedRide.customerId,
      corporateAccountId: updatedRide.corporateAccountId,
      riderId:
        updatedRide.riderId,
      status:
        updatedRide.status,
    },
  );

  return updatedRide;
}

export async function assignRider(
  id: string,
  riderId: string,
) {
  const ride = await findRideById(id);
  if (!ride) {
    throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');
  }

  assertTransition(ride.status, 'ASSIGNED');

  const result = await assignRideToRiderIfAvailable(id, riderId);
  if (result.kind === 'not-found') {
    throw new AppError('Ride not found.', 404, 'RIDE_NOT_FOUND');
  }
  if (result.kind === 'busy') {
    throw new AppError('Rider already has an active ride.', 409, 'RIDER_BUSY');
  }
  if (result.kind === 'unavailable') {
    throw new AppError('Ride has already been assigned.', 409, 'RIDE_ALREADY_ASSIGNED');
  }

  const updatedRide = result.ride;
  if (result.kind === 'assigned') {
    await rideEvents.publish('ride.assigned', id, {
      customerId: updatedRide.customerId,
      corporateAccountId: updatedRide.corporateAccountId,
      riderId,
      status: updatedRide.status,
    });
  }

  return updatedRide;
}
export async function markDriverArriving(
  id: string,
) {
  const ride =
    await findRideById(id);

  if (!ride) {
    throw new AppError(
      'Ride not found.',
      404,
      'RIDE_NOT_FOUND',
    );
  }

  assertTransition(
    ride.status,
    'DRIVER_ARRIVING',
  );

  const updatedRide =
    await updateRide(
      id,
      {
        status:
          'DRIVER_ARRIVING',
      },
    );

  await rideEvents.publish(
    'ride.driver_arriving',
    id,
    {
      customerId:
        updatedRide.customerId,
      corporateAccountId: updatedRide.corporateAccountId,
      riderId:
        updatedRide.riderId,
      status:
        updatedRide.status,
    },
  );

  return updatedRide;
}

export async function startRide(
  id: string,
  otp?: string,
) {
  const ride =
    await findRideById(id);

  if (!ride) {
    throw new AppError(
      'Ride not found.',
      404,
      'RIDE_NOT_FOUND',
    );
  }

  assertTransition(ride.status, 'IN_PROGRESS');

  if (ride.startOtpRequired) {
    if (!otp || !/^\d{6}$/.test(otp)) {
      throw new AppError('A six-digit ride start code is required.', 400, 'START_CODE_REQUIRED');
    }
    const submittedHash = crypto.createHash('sha256').update(otp).digest('hex');
    const storedOtp = await findRideStartOtp(id);
    const validOtp = storedOtp && storedOtp.expiresAt > new Date() &&
      crypto.timingSafeEqual(Buffer.from(submittedHash), Buffer.from(storedOtp.secretHash));
    if (!validOtp) {
      await startOtpFailuresByRide.enforce(`ride:${id}`, 'Too many incorrect ride start codes. Try again later.');
      throw new AppError('The ride start code is invalid or expired.', 400, 'INVALID_START_CODE');
    }
    const consumed = await consumeRideStartOtp(id, storedOtp.secretHash);
    if (consumed.count !== 1) {
      throw new AppError('The ride start code is invalid or already used.', 409, 'START_CODE_ALREADY_USED');
    }
  }

  const updatedRide =
    await updateRide(
      id,
      {
        status:
          'IN_PROGRESS',
        startedAt:
          new Date(),
      },
    );

  await rideEvents.publish(
    'ride.started',
    id,
    {
      customerId:
        updatedRide.customerId,
      corporateAccountId: updatedRide.corporateAccountId,
      riderId:
        updatedRide.riderId,
      status:
        updatedRide.status,
    },
  );

  return updatedRide;
}

export async function completeRide(
  id: string,
) {
  const updatedRide = await recordCompletionConfirmation(id, 'rider');
  if (!updatedRide) {
    throw new AppError(
      'Only an in-progress ride can be completed.',
      409,
      'RIDE_NOT_IN_PROGRESS',
    );
  }

  if (updatedRide.status === 'COMPLETED') {
    await rideEvents.publish('ride.completed', id, {
      customerId: updatedRide.customerId,
      corporateAccountId: updatedRide.corporateAccountId,
      riderId: updatedRide.riderId,
      status: updatedRide.status,
    });
  }

  return updatedRide;
}

export async function confirmRideAsCustomer(id: string) {
  const updatedRide = await recordCompletionConfirmation(id, 'customer');
  if (!updatedRide) {
    throw new AppError(
      'Only an in-progress ride can be confirmed complete.',
      409,
      'RIDE_NOT_IN_PROGRESS',
    );
  }

  if (updatedRide.status === 'COMPLETED') {
    await rideEvents.publish('ride.completed', id, {
      customerId: updatedRide.customerId,
      corporateAccountId: updatedRide.corporateAccountId,
      riderId: updatedRide.riderId,
      status: updatedRide.status,
    });
  }
  return updatedRide;
}

export async function cancelRide(
  id: string,
  reason:
    | 'CUSTOMER'
    | 'RIDER'
    | 'SYSTEM',
) {
  const ride =
    await findRideById(id);

  if (!ride) {
    throw new AppError(
      'Ride not found.',
      404,
      'RIDE_NOT_FOUND',
    );
  }

  assertTransition(
    ride.status,
    'CANCELLED',
  );

  const updatedRide =
    await updateRide(
      id,
      {
        status:
          'CANCELLED',
        cancellationReason:
          reason,
        cancelledAt:
          new Date(),
      },
    );

  await rideEvents.publish(
    'ride.cancelled',
    id,
    {
      customerId:
        updatedRide.customerId,
      corporateAccountId: updatedRide.corporateAccountId,
      riderId:
        updatedRide.riderId,
      reason,
      status:
        updatedRide.status,
    },
  );

  // Refunds for captured advance payments are retried by the worker. The
  // handler rechecks persisted cancellation and uses a stable job identity.
  await enqueue('refund', { rideId: id }, {
    jobId: `refund-${id}`,
    attempts: 5,
    backoff: { type: 'exponential', delay: 5_000 },
  });

  return updatedRide;
}

function getRideEventType(
  status: RideStatus,
) {
  switch (status) {
    case 'SEARCHING':
      return 'ride.searching' as const;

    case 'ASSIGNED':
      return 'ride.assigned' as const;

    case 'DRIVER_ARRIVING':
      return 'ride.driver_arriving' as const;

    case 'IN_PROGRESS':
      return 'ride.started' as const;

    case 'COMPLETED':
      return 'ride.completed' as const;

    case 'CANCELLED':
      return 'ride.cancelled' as const;

    case 'REQUESTED':
      return 'ride.requested' as const;
  }
}
