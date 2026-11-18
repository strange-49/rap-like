import type { IncomingMessage } from 'node:http';

import { AppError } from '../errors/app-error';
import { consoleLogger } from '../logging/logger';
import { getRedis, redisEnabled } from '../../infrastructure/redis';
import type { Redis } from 'ioredis';

export class RateLimitError extends AppError {
  public constructor(public readonly retryAfterSeconds: number, message = 'Too many requests. Please try again later.') {
    super(message, 429, 'RATE_LIMITED');
    this.name = 'RateLimitError';
  }
}

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  /**
   * Unique name. Used as the Redis key prefix, so two limiters never share counters.
   */
  name?: string;
  /**
   * true  -> counters live in Redis when REDIS_URL is set, so the limit holds across ALL
   *          backend instances (use for security-critical limits such as login / OTP).
   * false -> in-memory, per process (cheap; fine for coarse guards).
   * If Redis is unreachable a shared limiter silently falls back to memory.
   */
  shared?: boolean;
  /** Behaviour when a configured shared backend is unavailable. */
  outagePolicy?: 'fail-closed' | 'use-local';
}

export class SharedRateLimitUnavailableError extends AppError {
  public constructor() {
    super('Shared security rate limiting is temporarily unavailable.', 503, 'RATE_LIMIT_BACKEND_UNAVAILABLE');
    this.name = 'SharedRateLimitUnavailableError';
  }
}

interface Bucket {
  count: number;
  resetAt: number;
}

interface ConsumeResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

// Atomic fixed-window counter: INCR, start the TTL on first hit, return count + remaining TTL.
const CONSUME_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end
return {count, ttl}
`;

// Read-only: current count + remaining TTL without counting a hit.
const PEEK_SCRIPT = `
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;

/**
 * Fixed-window rate limiter. In-memory by default; Redis-backed when `shared`
 * is true and REDIS_URL is configured (so it works behind a load balancer).
 */
export class RateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private sweepTimer: NodeJS.Timeout | null = null;

  public constructor(
    private readonly options: RateLimitOptions,
    private readonly now: () => number = Date.now,
    private readonly redisProvider: () => Redis | null = getRedis,
  ) {}

  /** Counts one hit for `key`. Returns whether it is still within the limit. */
  public async consume(key: string): Promise<ConsumeResult> {
    if (rateLimitingDisabled()) return { allowed: true, retryAfterSeconds: 0 };

    const redis = this.sharedRedis();
    if (redis) {
      try {
        const [count, ttlMs] = (await redis.eval(
          CONSUME_SCRIPT,
          1,
          this.redisKey(key),
          String(this.options.windowMs),
        )) as [number, number];
        return {
          allowed: count <= this.options.max,
          retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
        };
      } catch (error) {
        this.logRedisFallback(error);
        if (this.failClosedOnRedisFailure()) throw new SharedRateLimitUnavailableError();
      }
    } else if (this.failClosedOnRedisFailure()) {
      throw new SharedRateLimitUnavailableError();
    }
    return this.consumeLocal(key);
  }

  /** True when `key` has already used up its budget (does not count a hit). */
  public async isLimited(key: string): Promise<{ limited: boolean; retryAfterSeconds: number }> {
    if (rateLimitingDisabled()) return { limited: false, retryAfterSeconds: 0 };

    const redis = this.sharedRedis();
    if (redis) {
      try {
        const [count, ttlMs] = (await redis.eval(PEEK_SCRIPT, 1, this.redisKey(key))) as [number, number];
        return {
          limited: count >= this.options.max,
          retryAfterSeconds: Math.max(1, Math.ceil(Math.max(ttlMs, 0) / 1000)),
        };
      } catch (error) {
        this.logRedisFallback(error);
        if (this.failClosedOnRedisFailure()) throw new SharedRateLimitUnavailableError();
      }
    } else if (this.failClosedOnRedisFailure()) {
      throw new SharedRateLimitUnavailableError();
    }
    return this.isLimitedLocal(key);
  }

  public async reset(key: string): Promise<void> {
    this.buckets.delete(key);
    const redis = this.sharedRedis();
    if (!redis) return;
    try {
      await redis.del(this.redisKey(key));
    } catch (error) {
      this.logRedisFallback(error);
    }
  }

  /** Throws RateLimitError when the key is over budget. */
  public async enforce(key: string, message?: string): Promise<void> {
    const result = await this.consume(key);
    if (!result.allowed) throw new RateLimitError(result.retryAfterSeconds, message);
  }

  public get size(): number {
    return this.buckets.size;
  }

  // ---- in-memory implementation -------------------------------------------------

  private consumeLocal(key: string): ConsumeResult {
    this.ensureSweeper();
    const current = this.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= current) {
      bucket = { count: 0, resetAt: current + this.options.windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    return {
      allowed: bucket.count <= this.options.max,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - current) / 1000)),
    };
  }

  private isLimitedLocal(key: string): { limited: boolean; retryAfterSeconds: number } {
    const current = this.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= current) return { limited: false, retryAfterSeconds: 0 };
    return {
      limited: bucket.count >= this.options.max,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - current) / 1000)),
    };
  }

  private ensureSweeper(): void {
    if (this.sweepTimer) return;
    this.sweepTimer = setInterval(() => {
      const current = this.now();
      for (const [key, bucket] of this.buckets) {
        if (bucket.resetAt <= current) this.buckets.delete(key);
      }
    }, Math.max(30_000, this.options.windowMs));
    this.sweepTimer.unref();
  }

  // ---- redis helpers ---------------------------------------------------------------

  private sharedRedis() {
    return this.options.shared && this.options.name ? this.redisProvider() : null;
  }

  private failClosedOnRedisFailure(): boolean {
    if (!this.options.shared || !this.options.name) return false;
    if (this.options.outagePolicy) return this.options.outagePolicy === 'fail-closed';
    // Local development can run without Redis. Production must not silently
    // turn a cross-instance authentication/OTP limit into per-process limits.
    return redisEnabled() || process.env.NODE_ENV === 'production';
  }

  private redisKey(key: string): string {
    return `rl:${this.options.name}:${key}`;
  }

  private lastFallbackLogAt = 0;
  private logRedisFallback(error: unknown): void {
    const nowMs = Date.now();
    if (nowMs - this.lastFallbackLogAt < 30_000) return;
    this.lastFallbackLogAt = nowMs;
    consoleLogger.error('ratelimit.redis_fallback', { limiter: this.options.name, error: String(error) });
  }
}

function rateLimitingDisabled(): boolean {
  return process.env.RATE_LIMIT_DISABLED === 'true' && process.env.NODE_ENV !== 'production';
}

/** Client IP. X-Forwarded-For is only trusted when TRUST_PROXY=true. */
export function clientIp(request: IncomingMessage): string {
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = request.headers['x-forwarded-for'];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.socket.remoteAddress ?? 'unknown';
}
