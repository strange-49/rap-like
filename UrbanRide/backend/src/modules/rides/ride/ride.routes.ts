import type {
  IncomingMessage,
  ServerResponse,
} from 'node:http';

import type { AuthContext } from '../../../common/auth/auth-context';
import { readJsonObject } from '../../../common/http/body';
import {
  handleAssignRider,
  handleCancelRide,
  handleCompleteRide,
  handleDriverArriving,
  handleGetCustomerRides,
  handleGetRequestedRides,
  handleGetRiderActiveRide,
  handleCustomerConfirmCompletion,
  handleGetCustomerStartOtp,
  handleGetRiderHistory,
  handleRateRide,
  handleGetRide,
  handleGetRideLocation,
  handleReportRideLocation,
  handleReportRiderLocation,
  handleRequestRide,
  handleStartRide,
  handleTransitionRide,
} from './ride.controller';

export async function handleRideRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  authContext: AuthContext | null = null,
): Promise<boolean> {
  const method = request.method ?? 'GET';
  const url = new URL(
    request.url ?? '/',
    'http://localhost',
  );
  const pathname = url.pathname;

  if (method === 'POST' && pathname === '/rides/rider/location') {
    const body = await readJsonBody(request);
    await handleReportRiderLocation(body, authContext, response);
    return true;
  }

  const rideLocationMatch = pathname.match(/^\/rides\/([^/]+)\/location$/);
  if (rideLocationMatch && method === 'POST') {
    const body = await readJsonBody(request);
    await handleReportRideLocation(rideLocationMatch[1], body, authContext, response);
    return true;
  }
  if (rideLocationMatch && method === 'GET') {
    await handleGetRideLocation(rideLocationMatch[1], authContext, response);
    return true;
  }

  if (
    method === 'GET' &&
    pathname === '/rides/rider/active'
  ) {
    await handleGetRiderActiveRide(authContext, response);
    return true;
  }

  if (method === 'GET' && pathname === '/rides/rider/history') {
    await handleGetRiderHistory(authContext, response);
    return true;
  }

  const customerCompletionMatch = pathname.match(
    /^\/rides\/([^/]+)\/confirm-completion$/,
  );
  if (method === 'POST' && customerCompletionMatch) {
    await handleCustomerConfirmCompletion(
      customerCompletionMatch[1],
      authContext,
      response,
    );
    return true;
  }

  const ratingMatch = pathname.match(/^\/rides\/([^/]+)\/rating$/);
  if (method === 'POST' && ratingMatch) {
    const body = await readJsonBody(request);
    await handleRateRide(ratingMatch[1], body, authContext, response);
    return true;
  }

  const startOtpMatch = pathname.match(/^\/rides\/([^/]+)\/start-otp$/);
  if (method === 'GET' && startOtpMatch) {
    await handleGetCustomerStartOtp(startOtpMatch[1], authContext, response);
    return true;
  }

  if (method === 'POST' && pathname === '/rides') {
    const input = await readJsonBody(request);

    await handleRequestRide(
      input,
      authContext,
      response,
    );

    return true;
  }

  if (
    method === 'GET' &&
    pathname === '/rides/customer'
  ) {
    await handleGetCustomerRides(
      authContext,
      response,
    );

    return true;
  }

  if (
    method === 'GET' &&
    pathname === '/rides/requested'
  ) {
    await handleGetRequestedRides(
      authContext,
      response,
    );

    return true;
  }

  const rideMatch = pathname.match(
    /^\/rides\/([^/]+)$/,
  );

  if (rideMatch) {
    const rideId = rideMatch[1];

    if (method === 'GET') {
      await handleGetRide(
        rideId,
        authContext,
        response,
      );

      return true;
    }

    if (method === 'PATCH') {
      const body = await readJsonBody(request);

      await handleTransitionRide(
        rideId,
        body as {
          status: Parameters<
            typeof handleTransitionRide
          >[1]['status'];
        },
        authContext,
        response,
      );

      return true;
    }

    if (method === 'DELETE') {
      const body = await readJsonBody(request);

      await handleCancelRide(
        rideId,
        body,
        authContext,
        response,
      );

      return true;
    }
  }

  const assignMatch = pathname.match(
    /^\/rides\/([^/]+)\/assign$/,
  );

  if (
    method === 'POST' &&
    assignMatch
  ) {
    await handleAssignRider(
      assignMatch[1],
      authContext,
      response,
    );

    return true;
  }

  const actionMatch = pathname.match(
    /^\/rides\/([^/]+)\/(arrive|start|complete)$/,
  );

  if (
    method === 'POST' &&
    actionMatch
  ) {
    const rideId = actionMatch[1];
    const action = actionMatch[2];

    if (action === 'arrive') {
      await handleDriverArriving(
        rideId,
        authContext,
        response,
      );

      return true;
    }

    if (action === 'start') {
      const body = await readJsonBody(request);
      await handleStartRide(
        rideId,
        body,
        authContext,
        response,
      );

      return true;
    }

    if (action === 'complete') {
      await handleCompleteRide(
        rideId,
        authContext,
        response,
      );

      return true;
    }
  }

  return false;
}

async function readJsonBody(
  request: IncomingMessage,
): Promise<Record<string, unknown>> {
  return readJsonObject(request);
}
