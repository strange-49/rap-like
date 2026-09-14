import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  getRiderDeviceTokens,
  registerDeviceToken,
  removeDeviceToken,
} from './device-token.service';

export async function handleDeviceTokenRoutes(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  );

  if (
    request.method === 'POST' &&
    url.pathname === '/notifications/device-token'
  ) {
    const riderId = url.searchParams.get('riderId');
    const token = url.searchParams.get('token');
    const platform = url.searchParams.get('platform') ?? undefined;

    if (!riderId?.trim() || !token?.trim()) {
      response.writeHead(400, {
        'content-type': 'application/json; charset=utf-8',
      });

      response.end(
        JSON.stringify({
          error: {
            code: 'DEVICE_TOKEN_FIELDS_REQUIRED',
            message: 'Rider ID and device token are required.',
          },
        }),
      );

      return true;
    }

    const deviceToken = await registerDeviceToken({
      riderId,
      token,
      platform,
    });

    response.writeHead(201, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(JSON.stringify(deviceToken));

    return true;
  }

  if (
    request.method === 'GET' &&
    url.pathname === '/notifications/device-tokens'
  ) {
    const riderId = url.searchParams.get('riderId');

    if (!riderId?.trim()) {
      response.writeHead(400, {
        'content-type': 'application/json; charset=utf-8',
      });

      response.end(
        JSON.stringify({
          error: {
            code: 'RIDER_ID_REQUIRED',
            message: 'Rider ID is required.',
          },
        }),
      );

      return true;
    }

    const deviceTokens = await getRiderDeviceTokens(riderId);

    response.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
    });

    response.end(JSON.stringify(deviceTokens));

    return true;
  }

  if (
    request.method === 'DELETE' &&
    url.pathname === '/notifications/device-token'
  ) {
    const token = url.searchParams.get('token');

    if (!token?.trim()) {
      response.writeHead(400, {
        'content-type': 'application/json; charset=utf-8',
      });

      response.end(
        JSON.stringify({
          error: {
            code: 'TOKEN_REQUIRED',
            message: 'Device token is required.',
          },
        }),
      );

      return true;
    }

    await removeDeviceToken(token);

    response.writeHead(204);
    response.end();

    return true;
  }

  return false;
}