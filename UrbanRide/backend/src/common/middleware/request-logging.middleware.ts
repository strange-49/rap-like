import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Logger } from '../logging/logger';

export type HttpHandler = (request: IncomingMessage, response: ServerResponse) => void | Promise<void>;

export function withRequestLogging(handler: HttpHandler, logger: Logger): HttpHandler {
  return (request, response) => {
    const startedAt = performance.now();

    response.on('finish', () => {
      logger.info('http.request.completed', {
        method: request.method,
        // Query strings may contain tokens or other personal data.
        path: (request.url ?? '').split('?')[0],
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      });
    });

    handler(request, response);
  };
}
