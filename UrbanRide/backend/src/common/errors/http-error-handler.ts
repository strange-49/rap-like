import type { ServerResponse } from 'node:http';

import { consoleLogger } from '../logging/logger';
import { AppError } from './app-error';

export function sendError(response: ServerResponse, error: unknown): void {
  const appError =
    error instanceof AppError
      ? error
      : new AppError('Internal server error.');

  if (appError.statusCode >= 500) {
    consoleLogger.error('http.request.failed', {
      code: appError.code,
      error: error instanceof Error ? (error.stack ?? error.message) : String(error),
    });
  }

  if (response.headersSent) {
    response.end();
    return;
  }

  const headers: Record<string, string> = {
    'content-type': 'application/json; charset=utf-8',
  };
  const retryAfterSeconds = (appError as { retryAfterSeconds?: number }).retryAfterSeconds;
  if (typeof retryAfterSeconds === 'number') headers['retry-after'] = String(retryAfterSeconds);
  if (appError.statusCode === 413) headers.connection = 'close';

  response.writeHead(appError.statusCode, headers);

  response.end(
    JSON.stringify({
      error: {
        code: appError.code,
        message: appError.message,
      },
    }),
  );
}
