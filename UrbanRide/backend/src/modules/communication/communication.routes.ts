import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthContext } from '../../common/auth/auth-context';
import { requireRole } from '../../common/authorization/require-role';
import { AppError } from '../../common/errors/app-error';
import { handleSendSms } from './communication.controller';

export async function handleCommunicationRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  authContext: AuthContext | null = null,
): Promise<boolean> {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

  if (request.method === 'POST' && url.pathname === '/communication/sms') {
    // Arbitrary recipient/message sending is an operational action. Restrict
    // this endpoint to authenticated administrators.
    requireRole(authContext, ['ADMIN']);

    let body = '';
    for await (const chunk of request) {
      body += chunk;
      if (body.length > 16_384) {
        throw new AppError('SMS request body exceeds 16 KB.', 413, 'REQUEST_BODY_TOO_LARGE');
      }
    }

    let input: unknown;
    try {
      input = JSON.parse(body);
    } catch {
      throw new AppError('Request body must be valid JSON.', 400, 'INVALID_JSON');
    }

    if (typeof input !== 'object' || input === null || Array.isArray(input)) {
      throw new AppError('Request body must be a JSON object.', 400, 'INVALID_JSON');
    }

    await handleSendSms(input as { to?: string; body?: string }, response);
    return true;
  }

  return false;
}
