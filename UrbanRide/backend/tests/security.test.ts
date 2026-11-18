import assert from 'node:assert/strict';
import { scryptSync } from 'node:crypto';
import { test } from 'node:test';

import { ActiveUserCache } from '../src/common/security/active-user';
import {
  hashPassword,
  needsPasswordHashUpgrade,
  verifyPassword,
} from '../src/common/security/password';
import {
  RateLimitError,
  RateLimiter,
  SharedRateLimitUnavailableError,
} from '../src/common/security/rate-limit';
import type { Redis } from 'ioredis';

test('rate limiter blocks after the budget and recovers after the window', async () => {
  let now = 1_000;
  const limiter = new RateLimiter({ windowMs: 60_000, max: 3 }, () => now);

  assert.equal((await limiter.consume('ip')).allowed, true);
  assert.equal((await limiter.consume('ip')).allowed, true);
  assert.equal((await limiter.consume('ip')).allowed, true);
  const blocked = await limiter.consume('ip');
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1);

  // A different key is unaffected.
  assert.equal((await limiter.consume('other')).allowed, true);

  now += 60_001;
  assert.equal((await limiter.consume('ip')).allowed, true);
});

test('enforce throws a 429 RateLimitError with Retry-After', async () => {
  const limiter = new RateLimiter({ windowMs: 60_000, max: 1 });
  await limiter.enforce('k');
  await assert.rejects(
    () => limiter.enforce('k'),
    (error: unknown) => error instanceof RateLimitError && error.statusCode === 429 && error.retryAfterSeconds >= 1,
  );
});

test('failure-only tracking: isLimited does not consume and reset clears', async () => {
  // Used for start-OTP brute force: only WRONG codes are counted.
  const limiter = new RateLimiter({ windowMs: 600_000, max: 5 });
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await limiter.isLimited('ride-1')).limited, false);
    await limiter.consume('ride-1');
  }
  assert.equal((await limiter.isLimited('ride-1')).limited, true);
  await limiter.reset('ride-1');
  assert.equal((await limiter.isLimited('ride-1')).limited, false);
});

test('a shared limiter uses local memory in development when Redis is not configured', async () => {
  delete process.env.REDIS_URL;
  process.env.NODE_ENV = 'development';
  const limiter = new RateLimiter({ name: 'unit-shared', windowMs: 60_000, max: 2, shared: true });
  assert.equal((await limiter.consume('k')).allowed, true);
  assert.equal((await limiter.consume('k')).allowed, true);
  assert.equal((await limiter.consume('k')).allowed, false);
});

test('a shared security limiter fails closed in production without Redis', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRedisUrl = process.env.REDIS_URL;
  process.env.NODE_ENV = 'production';
  delete process.env.REDIS_URL;
  try {
    const limiter = new RateLimiter({ name: 'production-shared', windowMs: 60_000, max: 2, shared: true });
    await assert.rejects(() => limiter.consume('ip'), (error: unknown) =>
      error instanceof SharedRateLimitUnavailableError && error.statusCode === 503,
    );
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousRedisUrl;
  }
});

test('RATE_LIMIT_DISABLED cannot disable limits in production', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRedisUrl = process.env.REDIS_URL;
  const previousDisabled = process.env.RATE_LIMIT_DISABLED;
  process.env.NODE_ENV = 'production';
  process.env.RATE_LIMIT_DISABLED = 'true';
  delete process.env.REDIS_URL;
  try {
    const limiter = new RateLimiter({ name: 'production-disable-guard', windowMs: 60_000, max: 1, shared: true });
    await assert.rejects(() => limiter.consume('ip'), { code: 'RATE_LIMIT_BACKEND_UNAVAILABLE' });
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousRedisUrl;
    if (previousDisabled === undefined) delete process.env.RATE_LIMIT_DISABLED;
    else process.env.RATE_LIMIT_DISABLED = previousDisabled;
  }
});

test('a configured shared limiter fails closed when Redis commands fail', async () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousRedisUrl = process.env.REDIS_URL;
  process.env.NODE_ENV = 'production';
  process.env.REDIS_URL = 'redis://unavailable.invalid:6379';
  const unavailableRedis = { eval: async () => { throw new Error('connection refused'); } } as unknown as Redis;
  try {
    const limiter = new RateLimiter(
      { name: 'outage-shared', windowMs: 60_000, max: 2, shared: true },
      Date.now,
      () => unavailableRedis,
    );
    await assert.rejects(() => limiter.consume('ip'), { code: 'RATE_LIMIT_BACKEND_UNAVAILABLE', statusCode: 503 });
    await assert.rejects(() => limiter.isLimited('otp'), { code: 'RATE_LIMIT_BACKEND_UNAVAILABLE', statusCode: 503 });
  } finally {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
    if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousRedisUrl;
  }
});

test('local fallback is available only when explicitly selected for a shared limiter', async () => {
  const previousRedisUrl = process.env.REDIS_URL;
  process.env.REDIS_URL = 'redis://unavailable.invalid:6379';
  const unavailableRedis = { eval: async () => { throw new Error('connection refused'); } } as unknown as Redis;
  try {
    const limiter = new RateLimiter(
      { name: 'explicit-local', windowMs: 60_000, max: 1, shared: true, outagePolicy: 'use-local' },
      Date.now,
      () => unavailableRedis,
    );
    assert.equal((await limiter.consume('ip')).allowed, true);
    assert.equal((await limiter.consume('ip')).allowed, false);
  } finally {
    if (previousRedisUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = previousRedisUrl;
  }
});

test('new passwords use a random salt; legacy username-salted hashes still verify', async () => {
  const first = await hashPassword('correct horse battery');
  const second = await hashPassword('correct horse battery');
  assert.notEqual(first, second);
  assert.ok(first.startsWith('scrypt$'));
  assert.equal(await verifyPassword('correct horse battery', first, 'user@example.com'), true);
  assert.equal(await verifyPassword('wrong password', first, 'user@example.com'), false);
  assert.equal(needsPasswordHashUpgrade(first), false);

  const legacy = scryptSync('old-password', 'user@example.com', 64).toString('hex');
  assert.equal(needsPasswordHashUpgrade(legacy), true);
  assert.equal(await verifyPassword('old-password', legacy, 'user@example.com'), true);
  assert.equal(await verifyPassword('old-password', legacy, 'someone-else'), false);
});

test('malformed stored hashes never verify (and never throw)', async () => {
  assert.equal(await verifyPassword('x', '', 'u'), false);
  assert.equal(await verifyPassword('x', 'scrypt$$', 'u'), false);
  assert.equal(await verifyPassword('x', 'not-hex!', 'u'), false);
});

test('suspended users are noticed within the cache TTL, or at once when invalidated', async () => {
  let active = true;
  let lookups = 0;
  let now = 0;
  const cache = new ActiveUserCache(async () => { lookups += 1; return active; }, 30_000, () => now);

  assert.equal(await cache.isActive('u1'), true);
  assert.equal(await cache.isActive('u1'), true);
  assert.equal(lookups, 1, 'second call is served from cache');

  active = false;
  assert.equal(await cache.isActive('u1'), true, 'still cached');
  cache.invalidate('u1');
  assert.equal(await cache.isActive('u1'), false, 'invalidate applies a suspension immediately');

  active = true;
  now += 30_001;
  assert.equal(await cache.isActive('u1'), true, 'TTL expiry refreshes');
});
