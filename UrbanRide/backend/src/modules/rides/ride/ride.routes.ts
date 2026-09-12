import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  handleAssignRider,
  handleCancelRide,
  handleCompleteRide,
  handleDriverArriving,
  handleGetRequestedRides,
  handleGetRide,
  handleRequestRide,
  handleStartRide,
  handleTransitionRide,
} from './ride.controller';

export async function handleRideRoutes(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  );

  if (request.method === 'POST' && url.pathname === '/rides') {
    let body = '';

    for await (const chunk of request) {
      body += chunk;
    }

    const input = JSON.parse(body);

    await handleRequestRide(input, response);

    return true;
  }

  if (
    request.method === 'GET' &&
    url.pathname === '/rides/available'
  ) {
    await handleGetRequestedRides(response);

    return true;
  }

  if (
    request.method === 'POST' &&
    url.pathname.startsWith('/rides/') &&
    url.pathname.endsWith('/assign')
  ) {
    const rideId = url.pathname.slice('/rides/'.length, -'/assign'.length);

    if (!rideId) {
      return false;
    }

    let body = '';

    for await (const chunk of request) {
      body += chunk;
    }

    const input = JSON.parse(body);

    await handleAssignRider(rideId, input, response);

    return true;
  }

  if (
    request.method === 'POST' &&
    url.pathname.startsWith('/rides/') &&
    url.pathname.endsWith('/arrive')
  ) {
    const rideId = url.pathname.slice('/rides/'.length, -'/arrive'.length);

    if (!rideId) {
      return false;
    }

    await handleDriverArriving(rideId, response);

    return true;
  }

  if (
    request.method === 'POST' &&
    url.pathname.startsWith('/rides/') &&
    url.pathname.endsWith('/start')
  ) {
    const rideId = url.pathname.slice('/rides/'.length, -'/start'.length);

    if (!rideId) {
      return false;
    }

    await handleStartRide(rideId, response);

    return true;
  }

  if (
    request.method === 'POST' &&
    url.pathname.startsWith('/rides/') &&
    url.pathname.endsWith('/complete')
  ) {
    const rideId = url.pathname.slice(
      '/rides/'.length,
      -'/complete'.length,
    );

    if (!rideId) {
      return false;
    }

    await handleCompleteRide(rideId, response);

    return true;
  }

  if (
    request.method === 'POST' &&
    url.pathname.startsWith('/rides/') &&
    url.pathname.endsWith('/cancel')
  ) {
    const rideId = url.pathname.slice('/rides/'.length, -'/cancel'.length);

    if (!rideId) {
      return false;
    }

    let body = '';

    for await (const chunk of request) {
      body += chunk;
    }

    const input = JSON.parse(body);

    await handleCancelRide(rideId, input, response);

    return true;
  }

  if (request.method === 'GET' && url.pathname.startsWith('/rides/')) {
    const rideId = url.pathname.slice('/rides/'.length);

    if (!rideId) {
      return false;
    }

    await handleGetRide(rideId, response);

    return true;
  }

  if (
    request.method === 'PATCH' &&
    url.pathname.startsWith('/rides/') &&
    url.pathname.endsWith('/status')
  ) {
    const rideId = url.pathname.slice('/rides/'.length, -'/status'.length);

    if (!rideId) {
      return false;
    }

    let body = '';

    for await (const chunk of request) {
      body += chunk;
    }

    const input = JSON.parse(body);

    await handleTransitionRide(rideId, input, response);

    return true;
  }

  return false;
}