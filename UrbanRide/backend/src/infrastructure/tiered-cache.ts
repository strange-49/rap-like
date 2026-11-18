import { TtlCache } from '../common/cache/ttl-cache';
import { getRedis } from './redis';

/**
 * Two-level cache:
 *   L1  in-memory (microseconds, per process)
 *   L2  Redis, when REDIS_URL is set (shared by every backend instance, survives restarts)
 * Without Redis it behaves exactly like the old in-memory TtlCache.
 * Redis errors are never fatal: a failed read is a miss, a failed write is skipped.
 *
 * Only cache data that is safe to serve slightly stale (routes, geocoding).
 * Never cache ride state or anything per-user-sensitive.
 */
export class TieredCache<V> {
  private readonly local: TtlCache<V>;

  public constructor(
    private readonly namespace: string,
    private readonly ttlMs: number,
    maxLocalEntries = 500,
  ) {
    // L1 lives shorter than L2 so instances converge quickly on refreshed values.
    this.local = new TtlCache<V>(Math.min(ttlMs, 60_000), maxLocalEntries);
  }

  public async get(key: string): Promise<V | undefined> {
    const hit = this.local.get(key);
    if (hit !== undefined) return hit;

    const redis = getRedis();
    if (!redis) return undefined;
    try {
      const raw = await redis.get(this.redisKey(key));
      if (raw === null) return undefined;
      const value = JSON.parse(raw) as V;
      this.local.set(key, value);
      return value;
    } catch {
      return undefined;
    }
  }

  public async set(key: string, value: V): Promise<void> {
    this.local.set(key, value);

    const redis = getRedis();
    if (!redis) return;
    try {
      await redis.set(this.redisKey(key), JSON.stringify(value), 'PX', this.ttlMs);
    } catch {
      // The cache is an optimization; ignore failures.
    }
  }

  private redisKey(key: string): string {
    return `cache:${this.namespace}:${key}`;
  }
}
