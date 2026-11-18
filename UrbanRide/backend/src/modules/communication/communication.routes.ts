import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthContext } from '../../common/auth/auth-context';
import { requireRole } from '../../common/authorization/require-role';
import { readJsonObject } from '../../common/http/body';
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

    const input = await readJsonObject(request, 16_384);

    await handleSendSms(input as { to?: string; body?: string }, response);
    return true;
  }

  return false;
}
