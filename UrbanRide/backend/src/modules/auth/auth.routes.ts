import type { HttpHandler } from '../../common/middleware/request-logging.middleware';
import { sendError } from '../../common/errors/http-error-handler';
import type { AuthController } from './auth.controller';

export const authRoutePrefix = '/auth/development';

export function createAuthRoutes(controller: AuthController): HttpHandler {
  return (request, response) => {
    const path = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`)
      .pathname;
    if (request.method === 'POST' && path === `${authRoutePrefix}/login`) {
      void controller
        .login(request, response)
        .catch((error: unknown) => sendError(response, error));
      return;
    }
    if (request.method === 'GET' && path === `${authRoutePrefix}/session`) {
      controller.currentSession(request, response);
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Route not found.' } }));
  };
}
