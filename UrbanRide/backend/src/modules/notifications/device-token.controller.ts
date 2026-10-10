import type {
  IncomingMessage,
  ServerResponse,
} from 'node:http';

import type { AuthContext } from '../../common/auth/auth-context';
import { AppError } from '../../common/errors/app-error';
import {
  getRiderDeviceTokens,
  registerDeviceToken,
  removeDeviceToken,
} from './device-token.service';

export async function handleDeviceTokenRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  authContext: AuthContext | null = null,
): Promise<boolean> {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  );

  if (
    request.method === 'POST' &&
    url.pathname === '/notifications/device-token'
  ) {
    requireRiderAuth(authContext);

    const token = url.searchParams.get('token');
    const platform =
      url.searchParams.get('platform') ?? undefined;

    if (!token?.trim()) {
      throw new AppError(
        'Device token is required.',
        400,
        'TOKEN_REQUIRED',
      );
    }

    const deviceToken = await registerDeviceToken({
      riderId: authContext.subjectId,
      token: token.trim(),
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
    requireRiderAuth(authContext);

    const deviceTokens = await getRiderDeviceTokens(
      authContext.subjectId,
    );

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
    requireRiderAuth(authContext);

    const token = url.searchParams.get('token');

    if (!token?.trim()) {
      throw new AppError(
        'Device token is required.',
        400,
        'TOKEN_REQUIRED',
      );
    }

    await removeDeviceToken(token.trim());

    response.writeHead(204);
    response.end();

    return true;
  }

  return false;
}

function requireRiderAuth(
  authContext: AuthContext | null,
): asserts authContext is AuthContext {
  if (!authContext) {
    throw new AppError(
      'Authentication is required.',
      401,
      'AUTHENTICATION_REQUIRED',
    );
  }

  if (authContext.role !== 'RIDER') {
    throw new AppError(
      'Only riders can manage rider device tokens.',
      403,
      'RIDER_ROLE_REQUIRED',
    );
  }
}