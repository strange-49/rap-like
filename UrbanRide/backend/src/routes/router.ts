import type { IncomingMessage, ServerResponse } from 'node:http';

import { sendError } from '../common/errors/http-error-handler';
import type { HttpHandler } from '../common/middleware/request-logging.middleware';
import { handleRideRoutes } from '../modules/rides/ride/ride.routes';
import { sendHealth, sendReadiness } from './health.routes';

export function createRouter(
  authRoutes: HttpHandler,
  rideRoutes: typeof handleRideRoutes,
) {
  return async (
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<void> => {
    try {
      const url = new URL(
        request.url ?? '/',
        `http://${request.headers.host ?? 'localhost'}`,
      );

      if (url.pathname.startsWith('/auth/')) {
        authRoutes(request, response);
        return;
      }

      if (url.pathname === '/rides' || url.pathname.startsWith('/rides/')) {
        const handled = await rideRoutes(request, response);

        if (handled) {
          return;
        }
      }

      if (request.method === 'GET' && url.pathname === '/health') {
        sendHealth(response);
        return;
      }

      if (request.method === 'GET' && url.pathname === '/ready') {
        sendReadiness(response);
        return;
      }

      response.writeHead(404, {
        'content-type': 'application/json; charset=utf-8',
      });

      response.end(
        JSON.stringify({
          error: {
            code: 'NOT_FOUND',
            message: 'Route not found.',
          },
        }),
      );
    } catch (error) {
      sendError(response, error);
    }
  };
}