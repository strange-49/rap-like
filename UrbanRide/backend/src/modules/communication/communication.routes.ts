import type { IncomingMessage, ServerResponse } from 'node:http';

import { handleSendSms } from './communication.controller';

export async function handleCommunicationRoutes(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<boolean> {
  const url = new URL(
    request.url ?? '/',
    `http://${request.headers.host ?? 'localhost'}`,
  );

  if (
    request.method === 'POST' &&
    url.pathname === '/communication/sms'
  ) {
    let body = '';

    for await (const chunk of request) {
      body += chunk;
    }

    const input = JSON.parse(body);

    await handleSendSms(input, response);

    return true;
  }

  return false;
}