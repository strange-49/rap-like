import { Redis, type RedisOptions } from 'ioredis';

import { consoleLogger } from '../common/logging/logger';

/**
 * Redis is OPTIONAL. Without REDIS_URL every feature that can use it keeps
 * working in a single-process, in-memory mode (exactly how the app behaved
 * before Redis was added). With REDIS_URL the same features become shared
 * across several backend instances.
 *
 * Upstash: use the TLS URL ("rediss://default:<password>@<host>:6379");
 * ioredis switches TLS on automatically for rediss:// URLs.
 */
export function redisEnabled(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

function baseOptions(): RedisOptions {
  return {
    connectTimeout: 5_000,
    // Reconnect forever, backing off up to 5 s between attempts.
    retryStrategy: (attempt) => Math.min(attempt * 500, 5_000),
  };
}

// ioredis emits 'error' on every failed reconnect; log it at most every 30 s.
const lastErrorLoggedAt = new Map<string, number>();
function attachErrorLogging(client: Redis, role: string): Redis {
  client.on('error', (error) => {
    const now = Date.now();
    if (now - (lastErrorLoggedAt.get(role) ?? 0) < 30_000) return;
    lastErrorLoggedAt.set(role, now);
    consoleLogger.error('redis.error', { role, error: String(error) });
  });
  return client;
}

let sharedClient: Redis | null | undefined;

/**
 * Connection for ordinary commands (rate limits, cache, rider locations).
 * Commands fail fast while Redis is unreachable (no offline queue), and every
 * caller falls back to in-memory behaviour instead of waiting.
 */
export function getRedis(): Redis | null {
  if (sharedClient !== undefined) return sharedClient;

  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    sharedClient = null;
    return null;
  }

  sharedClient = attachErrorLogging(
    new Redis(url, {
      ...baseOptions(),
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    }),
    'commands',
  );
  return sharedClient;
}

/** BullMQ needs its own connection with `maxRetriesPerRequest: null`. */
export function createBullConnection(role = 'bullmq'): Redis {
  const url = process.env.REDIS_URL?.trim();
  if (!url) throw new Error('REDIS_URL is not configured.');
  return attachErrorLogging(new Redis(url, { ...baseOptions(), maxRetriesPerRequest: null }), role);
}

/** A connection in subscriber mode cannot run normal commands, so pub/sub gets its own. */
export function createSubscriberConnection(): Redis {
  return createBullConnection('subscriber');
}

/**
 * Resolves true once the shared connection is ready (false after `timeoutMs`).
 * Commands are fail-fast until then, so call this at startup and in tests; the
 * app itself never needs to wait, it simply uses memory until Redis is ready.
 */
export function waitForRedis(timeoutMs = 3_000): Promise<boolean> {
  const client = getRedis();
  if (!client) return Promise.resolve(false);
  if (client.status === 'ready') return Promise.resolve(true);

  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      client.off('ready', onReady);
      resolve(false);
    }, timeoutMs);
    timer.unref();
    const onReady = () => {
      clearTimeout(timer);
      resolve(true);
    };
    client.once('ready', onReady);
  });
}

export type RedisStatus = 'disabled' | 'up' | 'down';

export async function redisStatus(timeoutMs = 1_000): Promise<RedisStatus> {
  const client = getRedis();
  if (!client) return 'disabled';
  try {
    if (client.status !== 'ready' && !(await waitForRedis(timeoutMs))) return 'down';
    await Promise.race([
      client.ping(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs).unref()),
    ]);
    return 'up';
  } catch {
    return 'down';
  }
}

export async function closeRedis(): Promise<void> {
  const client = sharedClient;
  sharedClient = undefined;
  if (!client) return;
  try {
    await client.quit();
  } catch {
    client.disconnect();
  }
}
