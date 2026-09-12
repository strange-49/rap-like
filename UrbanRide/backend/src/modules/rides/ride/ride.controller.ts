import type { ServerResponse } from 'node:http';

import type { RideStatus } from '../../../generated/prisma/client';
import type { RequestRideInput } from './ride.service';
import {
  assignRider,
  cancelRide,
  completeRide,
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

export async function handleRequestRide(
  body: unknown,
  response: ServerResponse,
): Promise<void> {
  const input: RequestRideInput = validateRequestRideInput(body);
  const ride = await requestRide(input);

  response.statusCode = 201;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(ride));
}

export async function handleGetRide(
  id: string,
  response: ServerResponse,
): Promise<void> {
  const ride = await getRideById(id);

  if (!ride) {
    response.writeHead(404, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(
      JSON.stringify({
        error: {
          code: 'RIDE_NOT_FOUND',
          message: 'Ride not found.',
        },
      }),
    );

    return;
  }

  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(ride));
}

export async function handleGetRequestedRides(
  response: ServerResponse,
): Promise<void> {
  const rides = await getRequestedRides();

  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(rides));
}

export async function handleTransitionRide(
  id: string,
  body: { status: RideStatus },
  response: ServerResponse,
): Promise<void> {
  const ride = await transitionRide(id, body.status);

  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(ride));
}

export async function handleAssignRider(
  id: string,
  body: { riderId: string },
  response: ServerResponse,
): Promise<void> {
  const ride = await assignRider(id, body.riderId);

  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(ride));
}

export async function handleDriverArriving(
  id: string,
  response: ServerResponse,
): Promise<void> {
  const ride = await markDriverArriving(id);

  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(ride));
}

export async function handleStartRide(
  id: string,
  response: ServerResponse,
): Promise<void> {
  const ride = await startRide(id);

  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(ride));
}

export async function handleCompleteRide(
  id: string,
  response: ServerResponse,
): Promise<void> {
  const ride = await completeRide(id);

  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(ride));
}

export async function handleCancelRide(
  id: string,
  body: unknown,
  response: ServerResponse,
): Promise<void> {
  const reason = validateCancellationReason(body);
  const ride = await cancelRide(id, reason);

  response.statusCode = 200;
  response.setHeader('Content-Type', 'application/json');
  response.end(JSON.stringify(ride));
}