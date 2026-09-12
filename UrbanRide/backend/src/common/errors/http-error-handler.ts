import type { ServerResponse } from 'node:http';

import { AppError } from './app-error';

export function sendError(response: ServerResponse, error: unknown): void {
  console.error(error);

  const appError =
    error instanceof AppError
      ? error
      : new AppError('Internal server error.');

  response.writeHead(appError.statusCode, {
    'content-type': 'application/json; charset=utf-8',
  });

  response.end(
    JSON.stringify({
      error: {
        code: appError.code,
        message: appError.message,
      },
    }),
  );
}