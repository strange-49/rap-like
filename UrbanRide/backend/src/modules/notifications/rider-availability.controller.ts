import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthContext } from '../../common/auth/auth-context';
import { AppError } from '../../common/errors/app-error';
import { readJsonObject } from '../../common/http/body';
import { getRiderAvailability, setRiderAvailability } from './rider-availability.repository';

function sendJson(response: ServerResponse, statusCode: number, data: unknown) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(data));
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  return readJsonObject(request, 2_000);
}

export async function handleRiderAvailabilityRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  authContext: AuthContext | null,
): Promise<boolean> {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  if (url.pathname !== '/riders/availability') return false;

  requireRiderAuth(authContext);

  if (request.method === 'GET') {
    const isOnline = await getRiderAvailability(authContext.subjectId);
    if (isOnline === null) throw new AppError('Rider account was not found or is inactive.', 404, 'RIDER_NOT_FOUND');
    sendJson(response, 200, { isOnline });
    return true;
  }

  if (request.method === 'PUT') {
    const body = await readJsonBody(request);
    if (typeof body.isOnline !== 'boolean') {
      throw new AppError('isOnline must be a boolean.', 400, 'INVALID_AVAILABILITY');
    }
    const isOnline = await setRiderAvailability(authContext.subjectId, body.isOnline);
    if (isOnline === null) throw new AppError('Rider account was not found or is inactive.', 404, 'RIDER_NOT_FOUND');
    sendJson(response, 200, { isOnline });
    return true;
  }

  return false;
}

function requireRiderAuth(authContext: AuthContext | null): asserts authContext is AuthContext {
  if (!authContext) throw new AppError('Authentication is required.', 401, 'AUTHENTICATION_REQUIRED');
  if (authContext.role !== 'RIDER') throw new AppError('Only riders can change rider availability.', 403, 'RIDER_ROLE_REQUIRED');
}
