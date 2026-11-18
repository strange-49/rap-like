import type { ServerResponse } from 'node:http';

import { prisma } from '../common/database/prisma';
import { INSTANCE_ID } from '../config/instance';
import { redisStatus } from '../infrastructure/redis';

function sendStatus(
  response: ServerResponse,
  statusCode: number,
  body: Record<string, unknown>,
): void {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

export function sendHealth(response: ServerResponse): void {
  sendStatus(response, 200, { status: 'ok' });
}

/** Ready only when the database actually answers. */
export async function sendReadiness(response: ServerResponse): Promise<void> {
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => setTimeout(() => reject(new Error('database timeout')), 2_000).unref()),
    ]);
    // Redis is optional (the app degrades to in-memory), so it never fails readiness;
    // it is reported so you can see whether sharing across instances is working.
    sendStatus(response, 200, { status: 'ready', instance: INSTANCE_ID, redis: await redisStatus() });
  } catch {
    sendStatus(response, 503, { status: 'unavailable' });
  }
}
