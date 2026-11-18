import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { redisEnabledForTests } from './helpers';

// Point every Redis-backed module at the TEST Redis before any of them is used.
if (redisEnabledForTests) process.env.REDIS_URL = process.env.TEST_REDIS_URL;
delete process.env.RATE_LIMIT_DISABLED;

import { RateLimiter } from '../../src/common/security/rate-limit';
import { closeQueue, enqueue, registerJobHandlers, startWorker } from '../../src/jobs/queue';
import { closeRedis, getRedis, redisStatus, waitForRedis } from '../../src/infrastructure/redis';
import { TieredCache } from '../../src/infrastructure/tiered-cache';
import { publishRideEventToBus, startRideEventBus } from '../../src/realtime/event-bus';
import { RiderLocationStore } from '../../src/realtime/rider-locations';
import { claimRidePushDelivery } from '../../src/modules/notifications/ride-push.service';
import type { RideEvent } from '../../src/realtime/ride-events';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function waitFor(condition: () => boolean, timeoutMs = 8_000) {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeoutMs) throw new Error('timed out waiting for condition');
    await sleep(25);
  }
}

describe('Redis-backed features against a real Redis', { skip: !redisEnabledForTests }, () => {
  const runId = Math.random().toString(36).slice(2, 8);

  before(async () => {
    assert.equal(await waitForRedis(5_000), true, 'could not connect to TEST_REDIS_URL');
    assert.equal(await redisStatus(), 'up');
  });

  after(async () => {
    const redis = getRedis();
    if (redis) {
      for (const pattern of [`rl:*${runId}*`, `cache:*${runId}*`, `push:dedupe:*`, 'rider:loc:*', 'bull:urbanride-jobs:*']) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) await redis.del(...keys);
      }
    }
    await closeQueue();
    await closeRedis();
  });

  test('a SHARED rate limiter counts across two "instances" (e.g. behind a load balancer)', async () => {
    // Two separate limiter objects = two backend instances with their own memory.
    const make = () => new RateLimiter({ name: `shared-${runId}`, windowMs: 60_000, max: 5, shared: true });
    const instanceA = make();
    const instanceB = make();

    for (let i = 0; i < 3; i += 1) assert.equal((await instanceA.consume('attacker')).allowed, true);
    for (let i = 0; i < 2; i += 1) assert.equal((await instanceB.consume('attacker')).allowed, true);

    // 5 guesses were spread over BOTH instances; the 6th is blocked on either one.
    assert.equal((await instanceA.consume('attacker')).allowed, false);
    assert.equal((await instanceB.consume('attacker')).allowed, false);
    assert.equal((await instanceB.isLimited('attacker')).limited, true);

    await instanceA.reset('attacker');
    assert.equal((await instanceB.isLimited('attacker')).limited, false);
  });

  test('an in-memory limiter is NOT shared (that is why login limits are marked shared)', async () => {
    const make = () => new RateLimiter({ name: `local-${runId}`, windowMs: 60_000, max: 1 });
    const a = make();
    const b = make();
    assert.equal((await a.consume('k')).allowed, true);
    assert.equal((await b.consume('k')).allowed, true, 'a different instance has its own counter');
  });

  test('the Redis counter is atomic: 50 concurrent hits allow exactly `max`', async () => {
    const limiter = new RateLimiter({ name: `atomic-${runId}`, windowMs: 60_000, max: 10, shared: true });
    const results = await Promise.all(Array.from({ length: 50 }, () => limiter.consume('burst')));
    assert.equal(results.filter((r) => r.allowed).length, 10);
  });

  test('the counter expires with its window', async () => {
    const limiter = new RateLimiter({ name: `expire-${runId}`, windowMs: 300, max: 1, shared: true });
    assert.equal((await limiter.consume('k')).allowed, true);
    assert.equal((await limiter.consume('k')).allowed, false);
    await sleep(400);
    assert.equal((await limiter.consume('k')).allowed, true);
  });

  test('cache: a value cached by one instance is served to another (L2 hit)', async () => {
    const instanceA = new TieredCache<{ km: number }>(`route-${runId}`, 60_000);
    const instanceB = new TieredCache<{ km: number }>(`route-${runId}`, 60_000);

    assert.equal(await instanceB.get('a>b'), undefined);
    await instanceA.set('a>b', { km: 4.8 });
    assert.deepEqual(await instanceB.get('a>b'), { km: 4.8 });
  });

  test('rider locations are shared through Redis between instances', async () => {
    const instanceA = new RiderLocationStore();
    const instanceB = new RiderLocationStore();

    const location = instanceA.set(`rider-${runId}`, { latitude: 12.97, longitude: 77.59 });
    assert.equal(instanceB.get(`rider-${runId}`), null, 'B has not seen it locally');

    await instanceA.publishShared(location);
    const seen = await instanceB.getFresh(`rider-${runId}`);
    assert.equal(seen?.latitude, 12.97);

    const batch = await instanceB.getManyFresh([`rider-${runId}`, 'nobody']);
    assert.equal(batch.size, 1);
  });

  test('event bus: an event published elsewhere reaches this instance; our own is not echoed', async () => {
    const received: RideEvent[] = [];
    const stop = startRideEventBus((event) => received.push(event));
    await sleep(300); // let the SUBSCRIBE reach Redis

    // Simulate ANOTHER instance publishing (different origin).
    const redis = getRedis()!;
    const foreign: RideEvent = { type: 'ride.started', rideId: `ride-${runId}`, timestamp: new Date().toISOString(), data: { x: 1 } };
    await redis.publish('urbanride:ride-events', JSON.stringify({ origin: 'some-other-instance', event: foreign }));
    await waitFor(() => received.length === 1);
    assert.equal(received[0].rideId, `ride-${runId}`);

    // Our own publish carries our INSTANCE_ID, so it must be ignored (already delivered locally).
    await publishRideEventToBus({ type: 'ride.completed', rideId: `own-${runId}`, timestamp: new Date().toISOString() });
    await sleep(300);
    assert.equal(received.length, 1);

    await stop();
  });

  test('queue: a job runs once, a failing job is retried, and a duplicate jobId is ignored', async () => {
    let refunds = 0;
    let flakyCalls = 0;
    const flakyIds: string[] = [];
    registerJobHandlers({
      refund: async ({ rideId }) => {
        if (rideId.startsWith('flaky')) {
          flakyCalls += 1;
          flakyIds.push(rideId);
          if (flakyCalls === 1) throw new Error('payment provider temporarily down');
          return;
        }
        refunds += 1;
      },
    });

    const stopWorker = startWorker();
    try {
      // Same jobId twice: BullMQ keeps one.
      const options = { jobId: `refund-${runId}`, attempts: 3, backoff: { type: 'fixed' as const, delay: 100 } };
      await enqueue('refund', { rideId: `ride-${runId}` }, options);
      await enqueue('refund', { rideId: `ride-${runId}` }, options);
      await waitFor(() => refunds >= 1);
      await sleep(500);
      assert.equal(refunds, 1, 'the duplicate was ignored, so the refund ran once');

      // First attempt fails, the retry succeeds.
      await enqueue('refund', { rideId: `flaky-${runId}` }, { jobId: `flaky-${runId}`, attempts: 3, backoff: { type: 'fixed', delay: 100 } });
      await waitFor(() => flakyCalls >= 2);
      assert.equal(flakyCalls, 2, 'one failure, one successful retry');
    } finally {
      await stopWorker();
    }
  });

  test('push idempotency claims are shared and atomic across instances', async () => {
    const rideId = `push-${runId}`;
    const claims = await Promise.all(Array.from({ length: 12 }, () => claimRidePushDelivery('ride.assigned', rideId)));
    assert.equal(claims.filter(Boolean).length, 1);
    assert.equal(await claimRidePushDelivery('ride.assigned', rideId), false, 'a retry must not send again');
  });
});
