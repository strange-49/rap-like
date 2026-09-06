import type { IncomingMessage, ServerResponse } from 'node:http';

import { sendError } from '../common/errors/http-error-handler';
import type { HttpHandler } from '../common/middleware/request-logging.middleware';
import { sendHealth, sendReadiness } from './health.routes';

export function createRouter(authRoutes: HttpHandler) {
  return (request: IncomingMessage, response: ServerResponse): void => {
    try {
      const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);

      if (url.pathname.startsWith('/auth/')) {
        authRoutes(request, response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        sendHealth(response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/ready') {
        sendReadiness(response);
        return;
      }

      response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }));
    } catch (error) {
      sendError(response, error);
    }
  };
}
