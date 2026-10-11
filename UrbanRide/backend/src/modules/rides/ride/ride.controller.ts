import type { ServerResponse } from 'node:http';

import type { AuthContext } from '../../../common/auth/auth-context';
import { AppError } from '../../../common/errors/app-error';
import type { RideStatus } from '../../../generated/prisma/client';
import type { RequestRideInput } from './ride.service';
import {
  assignRider,
  cancelRide,
  completeRide,
  confirmRideAsCustomer,
  getCustomerRides,
  getCustomerStartOtp,
  getRiderActiveRide,
  getRiderHistory,
  rateCompletedRide,
  getRequestedRides,
  getRideById,
  markDriverArriving,
  requestRide,
  startRide,
  transitionRide,
} from './ride.service';
import {
  validateCancellationReason,
  validateRequestRideInput,
} from './ride.validation';

function sendUnauthorized(
  response: ServerResponse,
): void {
  response.writeHead(401, {
    'content-type':
      'application/json; charset=utf-8',
  });

  response.end(
    JSON.stringify({
      error: {
        code: 'UNAUTHORIZED',
        message:
          'Authentication is required.',
      },
    }),
  );
}

function sendForbidden(
  response: ServerResponse,
  message =
    'You do not have permission to perform this action.',
): void {
  response.writeHead(403, {
    'content-type':
      'application/json; charset=utf-8',
  });

  response.end(
    JSON.stringify({
      error: {
        code: 'FORBIDDEN',
        message,
      },
    }),
  );
}

function sendNotFound(
  response: ServerResponse,
): void {
  response.writeHead(404, {
    'content-type':
      'application/json; charset=utf-8',
  });

  response.end(
    JSON.stringify({
      error: {
        code: 'RIDE_NOT_FOUND',
        message: 'Ride not found.',
      },
    }),
  );
}

function requireRider(
  authContext: AuthContext | null,
  response: ServerResponse,
): authContext is AuthContext {
  if (!authContext) {
    sendUnauthorized(response);
    return false;
  }

  if (authContext.role !== 'RIDER') {
    sendForbidden(
      response,
      'Rider access is required for this action.',
    );

    return false;
  }

  return true;
}

async function requireAssignedRider(
  rideId: string,
  authContext: AuthContext | null,
  response: ServerResponse,
) {
  if (!requireRider(
    authContext,
    response,
  )) {
    return null;
  }

  const ride =
    await getRideById(rideId);

  if (!ride) {
    sendNotFound(response);
    return null;
  }

  if (
    ride.riderId !==
    authContext.subjectId
  ) {
    sendForbidden(
      response,
      'You can only act on rides assigned to you.',
    );

    return null;
  }

  return ride;
}

export async function handleRequestRide(
  body: unknown,
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  if (!authContext) {
    sendUnauthorized(response);
    return;
  }

  if (
    authContext.role !== 'CUSTOMER'
  ) {
    sendForbidden(
      response,
      'Only customers can request rides.',
    );

    return;
  }

  const validatedInput =
    validateRequestRideInput(body);

  if (validatedInput.corporateAccountId && !authContext.corporateAccountId) {
    sendForbidden(response, 'Corporate bookings require a verified corporate employee login.');
    return;
  }

  const input: RequestRideInput = {
    ...validatedInput,
    customerId: authContext.subjectId,
    ...(authContext.corporateAccountId
      ? { corporateAccountId: authContext.corporateAccountId }
      : { corporateAccountId: undefined }),
  };

  const ride =
    await requestRide(input);

  response.statusCode = 201;
  response.setHeader(
    'Content-Type',
    'application/json',
  );

  response.end(
    JSON.stringify(ride),
  );
}

export async function handleGetCustomerRides(
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  if (!authContext) {
    sendUnauthorized(response);
    return;
  }

  if (
    authContext.role !== 'CUSTOMER'
  ) {
    sendForbidden(
      response,
      'Only customers can access customer ride history.',
    );

    return;
  }

  const rides =
    await getCustomerRides(
      authContext.subjectId,
    );

  response.statusCode = 200;
  response.setHeader(
    'Content-Type',
    'application/json',
  );

  response.end(
    JSON.stringify(rides),
  );
}

export async function handleGetRequestedRides(
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  if (!requireRider(
    authContext,
    response,
  )) {
    return;
  }

  const rides =
    await getRequestedRides();

  response.statusCode = 200;
  response.setHeader(
    'Content-Type',
    'application/json',
  );

  response.end(
    JSON.stringify(rides),
  );
}

export async function handleGetRiderActiveRide(
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  if (!requireRider(authContext, response)) return;
  const ride = await getRiderActiveRide(authContext.subjectId);
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(ride));
}

export async function handleCustomerConfirmCompletion(
  rideId: string,
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  if (!authContext) {
    sendUnauthorized(response);
    return;
  }
  if (authContext.role !== 'CUSTOMER') {
    sendForbidden(response, 'Customer access is required.');
    return;
  }
  const ride = await getRideById(rideId);
  if (!ride) {
    sendNotFound(response);
    return;
  }
  if (ride.customerId !== authContext.subjectId) {
    sendForbidden(response, 'You can only confirm your own ride.');
    return;
  }
  const updatedRide = await confirmRideAsCustomer(rideId);
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(updatedRide));
}

export async function handleGetCustomerStartOtp(
  rideId: string,
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  if (authContext?.role !== 'CUSTOMER') {
    sendForbidden(response, 'Customer access is required.');
    return;
  }
  const result = await getCustomerStartOtp(rideId, authContext.subjectId);
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(result));
}

export async function handleGetRiderHistory(
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  if (!requireRider(authContext, response)) return;
  const rides = await getRiderHistory(authContext.subjectId);
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(rides));
}

export async function handleRateRide(
  rideId: string,
  body: unknown,
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  if (authContext?.role !== 'CUSTOMER') {
    sendForbidden(response, 'Customer access is required.');
    return;
  }
  if (typeof body !== 'object' || body === null || !('score' in body)) {
    throw new AppError('A rating score is required.', 400, 'INVALID_RATING');
  }
  const input = body as { score: number; feedback?: string };
  if (input.feedback !== undefined && typeof input.feedback !== 'string') {
    throw new AppError('Feedback must be text.', 400, 'INVALID_FEEDBACK');
  }
  const rating = await rateCompletedRide(
    rideId,
    authContext.subjectId,
    input.score,
    input.feedback,
  );
  response.writeHead(201, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(rating));
}

export async function handleGetRide(
  rideId: string,
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  if (!authContext) {
    sendUnauthorized(response);
    return;
  }

  const ride =
    await getRideById(rideId);

  if (!ride) {
    sendNotFound(response);
    return;
  }

  if (
    authContext.role === 'CUSTOMER' &&
    ride.customerId !==
      authContext.subjectId
  ) {
    sendForbidden(
      response,
      'You do not have access to this ride.',
    );

    return;
  }

  if (
    authContext.role === 'RIDER' &&
    ride.riderId !==
      authContext.subjectId
  ) {
    sendForbidden(
      response,
      'You can only access rides assigned to you.',
    );

    return;
  }

  response.statusCode = 200;
  response.setHeader(
    'Content-Type',
    'application/json',
  );

  response.end(
    JSON.stringify(ride),
  );
}

export async function handleTransitionRide(
  rideId: string,
  body: {
    status: RideStatus;
  },
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  if (!authContext) {
    sendUnauthorized(response);
    return;
  }

  const ride =
    await getRideById(rideId);

  if (!ride) {
    sendNotFound(response);
    return;
  }

  /*
   * SEARCHING is the rider-side matching stage.
   *
   * A rider may move an unassigned REQUESTED ride
   * into SEARCHING. This does not assign ownership.
   *
   * All later rider lifecycle transitions require
   * the ride to already be assigned to that rider.
   */
  if (
    authContext.role === 'RIDER'
  ) {
    const isSearchingTransition =
      ride.status === 'REQUESTED' &&
      body.status === 'SEARCHING';

    if (
      !isSearchingTransition &&
      ride.riderId !==
        authContext.subjectId
    ) {
      sendForbidden(
        response,
        'You can only modify rides assigned to you.',
      );

      return;
    }
  } else if (
    authContext.role !== 'ADMIN' &&
    authContext.role !==
      'CLIENT_ADMIN'
  ) {
    sendForbidden(response);
    return;
  }

  const updatedRide =
    await transitionRide(
      rideId,
      body.status,
    );

  response.statusCode = 200;
  response.setHeader(
    'Content-Type',
    'application/json',
  );

  response.end(
    JSON.stringify(updatedRide),
  );
}

export async function handleAssignRider(
  rideId: string,
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  if (!requireRider(
    authContext,
    response,
  )) {
    return;
  }

  const ride =
    await getRideById(rideId);

  if (!ride) {
    sendNotFound(response);
    return;
  }

  /*
   * A fresh customer ride starts in REQUESTED.
   * The Rider app's Accept button assigns the ride
   * directly, so both REQUESTED and SEARCHING are
   * valid states for this assignment endpoint.
   */
  if (
    ride.status !== 'REQUESTED' &&
    ride.status !== 'SEARCHING'
  ) {
    sendForbidden(
      response,
      'Only requested or searching rides can be assigned.',
    );

    return;
  }

  if (
    ride.riderId &&
    ride.riderId !==
      authContext.subjectId
  ) {
    sendForbidden(
      response,
      'This ride is already assigned to another rider.',
    );

    return;
  }

  const assignedRide =
    await assignRider(
      rideId,
      authContext.subjectId,
    );

  response.statusCode = 200;
  response.setHeader(
    'Content-Type',
    'application/json',
  );

  response.end(
    JSON.stringify(assignedRide),
  );
}

export async function handleDriverArriving(
  rideId: string,
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  const ride =
    await requireAssignedRider(
      rideId,
      authContext,
      response,
    );

  if (!ride) {
    return;
  }

  const updatedRide =
    await markDriverArriving(
      rideId,
    );

  response.statusCode = 200;
  response.setHeader(
    'Content-Type',
    'application/json',
  );

  response.end(
    JSON.stringify(updatedRide),
  );
}

export async function handleStartRide(
  rideId: string,
  body: unknown,
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  const ride =
    await requireAssignedRider(
      rideId,
      authContext,
      response,
    );

  if (!ride) {
    return;
  }

  let otp: string | undefined;
  if (ride.startOtpRequired && (
    typeof body !== 'object' || body === null || !('otp' in body) ||
    typeof (body as { otp: unknown }).otp !== 'string' ||
    !/^\d{6}$/.test((body as { otp: string }).otp)
  )) {
    throw new AppError('A six-digit ride start code is required.', 400, 'START_CODE_REQUIRED');
  }
  if (ride.startOtpRequired) otp = (body as { otp: string }).otp;

  const updatedRide =
    await startRide(rideId, otp);

  response.statusCode = 200;
  response.setHeader(
    'Content-Type',
    'application/json',
  );

  response.end(
    JSON.stringify(updatedRide),
  );
}

export async function handleCompleteRide(
  rideId: string,
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  const ride =
    await requireAssignedRider(
      rideId,
      authContext,
      response,
    );

  if (!ride) {
    return;
  }

  const updatedRide =
    await completeRide(rideId);

  response.statusCode = 200;
  response.setHeader(
    'Content-Type',
    'application/json',
  );

  response.end(
    JSON.stringify(updatedRide),
  );
}

export async function handleCancelRide(
  rideId: string,
  body: unknown,
  authContext: AuthContext | null,
  response: ServerResponse,
): Promise<void> {
  if (!authContext) {
    sendUnauthorized(response);
    return;
  }

  const ride =
    await getRideById(rideId);

  if (!ride) {
    sendNotFound(response);
    return;
  }

  if (
    authContext.role === 'CUSTOMER' &&
    ride.customerId !==
      authContext.subjectId
  ) {
    sendForbidden(
      response,
      'You can only cancel your own rides.',
    );

    return;
  }

  if (
    authContext.role === 'RIDER' &&
    ride.riderId !==
      authContext.subjectId
  ) {
    sendForbidden(
      response,
      'You can only cancel rides assigned to you.',
    );

    return;
  }

  if (
    authContext.role !== 'CUSTOMER' &&
    authContext.role !== 'RIDER' &&
    authContext.role !== 'ADMIN' &&
    authContext.role !==
      'CLIENT_ADMIN'
  ) {
    sendForbidden(response);
    return;
  }

  const input =
    validateCancellationReason(body);

  const rideResult =
    await cancelRide(
      rideId,
      input,
    );

  response.statusCode = 200;
  response.setHeader(
    'Content-Type',
    'application/json',
  );

  response.end(
    JSON.stringify(rideResult),
  );
}
