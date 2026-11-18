import type { IncomingMessage } from 'node:http';

import { AppError } from '../errors/app-error';

/** Default cap for JSON request bodies (64 KiB). */
export const DEFAULT_MAX_BODY_BYTES = 64 * 1024;

function tooLarge(): AppError {
  return new AppError('Request body is too large.', 413, 'REQUEST_BODY_TOO_LARGE');
}

/**
 * Reads the request body as UTF-8 text with a hard size limit.
 * Chunks are collected as Buffers and decoded once, so multi-byte characters
 * that straddle chunk boundaries are never corrupted.
 */
export function readRawBody(
  request: IncomingMessage,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<string> {
  const declaredLength = Number(request.headers['content-length']);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return Promise.reject(tooLarge());
  }

  return new Promise<string>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let received = 0;

    const cleanup = () => {
      request.off('data', onData);
      request.off('end', onEnd);
      request.off('error', onError);
    };
    const onData = (chunk: Buffer | string) => {
      const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
      received += buffer.length;
      if (received > maxBytes) {
        cleanup();
        request.pause();
        reject(tooLarge());
        return;
      }
      chunks.push(buffer);
    };
    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks).toString('utf8'));
    };
    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    request.on('data', onData);
    request.on('end', onEnd);
    request.on('error', onError);
  });
}

/** Parses a JSON object body. Invalid JSON is a 400, never a 500. */
export function parseJsonObject(raw: string): Record<string, unknown> {
  if (!raw.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError('A valid JSON object is required.', 400, 'INVALID_JSON');
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new AppError('A valid JSON object is required.', 400, 'INVALID_JSON');
  }
  return parsed as Record<string, unknown>;
}

export async function readJsonObject(
  request: IncomingMessage,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<Record<string, unknown>> {
  return parseJsonObject(await readRawBody(request, maxBytes));
}
