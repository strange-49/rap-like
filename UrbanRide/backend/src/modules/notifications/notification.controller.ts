import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthContext } from '../../common/auth/auth-context';
import { requireRole } from '../../common/authorization/require-role';
import { sendPushNotification } from './notification.service';

export async function handleNotificationTest(
  request: IncomingMessage,
  response: ServerResponse,
  authContext: AuthContext | null = null,
): Promise<boolean> {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  if (request.method !== 'POST' || url.pathname !== '/notifications/test') return false;

  // This endpoint can trigger an actual push to a supplied device token.
  requireRole(authContext, ['ADMIN']);

  const token = url.searchParams.get('token');
  if (!token?.trim()) {
    response.writeHead(400, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: { code: 'TOKEN_REQUIRED', message: 'Firebase device token is required.' } }));
    return true;
  }

  try {
    const messageId = await sendPushNotification(token, {
      title: 'UrbanRide test notification',
      body: 'Firebase push notifications are working.',
      data: { type: 'test' },
    });
    response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ success: true, messageId }));
  } catch (error) {
    console.error(error);
    response.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: { code: 'NOTIFICATION_FAILED', message: 'Unable to send the notification.' } }));
  }
  return true;
}
