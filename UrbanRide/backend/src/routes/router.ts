import type { IncomingMessage, ServerResponse } from 'node:http';

import { sendError } from '../common/errors/http-error-handler';
import type { HttpHandler } from '../common/middleware/request-logging.middleware';
import {
  handleDeviceTokenRoutes,
} from '../modules/notifications/device-token.controller';
import { handleNotificationTest } from '../modules/notifications/notification.controller';
import { handlePaymentRoutes } from '../modules/payments/payment.routes';
import {
  handleGeocode,
  handleReverseGeocode,
} from '../modules/location/location.controller';
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

      if (url.pathname.startsWith('/notifications/')) {
        const handled = await handleDeviceTokenRoutes(
          request,
          response,
        );

        if (handled) {
          return;
        }

        if (
          request.method === 'POST' &&
          url.pathname === '/notifications/test'
        ) {
          const testHandled = await handleNotificationTest(
            request,
            response,
          );

          if (testHandled) {
            return;
          }
        }
      }

      if (url.pathname.startsWith('/payments/')) {
        const handled = await handlePaymentRoutes(
          request,
          response,
        );

        if (handled) {
          return;
        }
      }

      if (
        request.method === 'GET' &&
        url.pathname === '/location/geocode'
      ) {
        const handled = await handleGeocode(request, response);

        if (handled) {
          return;
        }
      }

      if (
        request.method === 'GET' &&
        url.pathname === '/location/reverse-geocode'
      ) {
        const handled = await handleReverseGeocode(
          request,
          response,
        );

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