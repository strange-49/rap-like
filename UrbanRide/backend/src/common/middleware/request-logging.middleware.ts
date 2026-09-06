import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Logger } from '../logging/logger';

export type HttpHandler = (request: IncomingMessage, response: ServerResponse) => void;

export function withRequestLogging(handler: HttpHandler, logger: Logger): HttpHandler {
  return (request, response) => {
    const startedAt = performance.now();

    response.on('finish', () => {
      logger.info('http.request.completed', {
        method: request.method,
        path: request.url,
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      });
    });

    handler(request, response);
  };
}
