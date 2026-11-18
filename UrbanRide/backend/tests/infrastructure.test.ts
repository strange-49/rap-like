import assert from 'node:assert/strict';
import { test } from 'node:test';

// These tests run WITHOUT Redis: they prove every Redis-backed feature degrades
// to the old single-process behaviour instead of breaking.
delete process.env.REDIS_URL;

import { dispatchJob, enqueue, queueEnabled, registerJobHandlers } from '../src/jobs/queue';
import { startRideEventBus, publishRideEventToBus } from '../src/realtime/event-bus';
import { RiderLocationStore } from '../src/realtime/rider-locations';
import { redisStatus } from '../src/infrastructure/redis';
import { TieredCache } from '../src/infrastructure/tiered-cache';
import { claimRidePushDelivery } from '../src/modules/notifications/ride-push.service';

test('without Redis there is no queue and jobs run in-process', async () => {
  assert.equal(queueEnabled(), false);

  const received: string[] = [];
  registerJobHandlers({
    refund: async ({ rideId }) => {
      received.push(rideId);
    },
  });

  await enqueue('refund', { rideId: 'ride-1' });
  // The inline run is fire-and-forget; give it a tick.
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(received, ['ride-1']);
});

test('a failing inline job is logged, never thrown into the request', async () => {
  registerJobHandlers({
    refund: async () => {
      throw new Error('payment provider down');
    },
  });
  await assert.doesNotReject(() => enqueue('refund', { rideId: 'ride-2' }));
  await new Promise((resolve) => setTimeout(resolve, 20));
});

test('a timed-out queue add retries with one stable submission path and never runs inline', async () => {
  let calls = 0;
  let inlineCalls = 0;
  const options = { jobId: 'push-ride-started-ride-123' };
  await dispatchJob(
    true,
    async () => {
      calls += 1;
      assert.equal(options.jobId, 'push-ride-started-ride-123');
      if (calls === 1) await new Promise((resolve) => setTimeout(resolve, 30));
      return { id: options.jobId };
    },
    async () => { inlineCalls += 1; },
    () => undefined,
    5,
    2,
  );
  await new Promise((resolve) => setTimeout(resolve, 35)); // let the first timed-out add settle
  assert.equal(calls, 2, 'the timed-out call is retried, then the same stable add can be acknowledged');
  assert.equal(inlineCalls, 0, 'an uncertain queue add must never execute inline');
});

test('exhausted queue failures do not fall back to an inline side effect', async () => {
  let inlineCalls = 0;
  const failures: number[] = [];
  await dispatchJob(
    true,
    async () => { throw new Error('Redis unavailable'); },
    async () => { inlineCalls += 1; },
    (_error, attempt) => failures.push(attempt),
  );
  assert.deepEqual(failures, [1, 2, 3]);
  assert.equal(inlineCalls, 0);
});

test('a ride event push is claimed only once in no-Redis mode', async () => {
  delete process.env.REDIS_URL;
  const rideId = `dedupe-${Math.random().toString(36).slice(2)}`;
  assert.equal(await claimRidePushDelivery('ride.assigned', rideId), true);
  assert.equal(await claimRidePushDelivery('ride.assigned', rideId), false);
});

test('event bus is a harmless no-op without Redis', async () => {
  const stop = startRideEventBus(() => assert.fail('nothing should be delivered'));
  await publishRideEventToBus({ type: 'ride.started', rideId: 'r', timestamp: new Date().toISOString() });
  await stop();
});

test('TieredCache behaves like a plain in-memory cache without Redis', async () => {
  const cache = new TieredCache<{ n: number }>('unit', 60_000);
  assert.equal(await cache.get('a'), undefined);
  await cache.set('a', { n: 1 });
  assert.deepEqual(await cache.get('a'), { n: 1 });
});

test('rider locations fall back to memory without Redis', async () => {
  const store = new RiderLocationStore();
  store.set('r1', { latitude: 12.9, longitude: 77.6 });
  await store.publishShared(store.get('r1')!); // no-op, must not throw

  assert.equal((await store.getFresh('r1'))?.latitude, 12.9);
  assert.equal(await store.getFresh('unknown'), null);

  const many = await store.getManyFresh(['r1', 'unknown']);
  assert.equal(many.size, 1);
  assert.ok(many.has('r1'));
});

test('redisStatus reports "disabled" when REDIS_URL is not set', async () => {
  assert.equal(await redisStatus(), 'disabled');
});

test('QUEUE_ENABLED=false keeps Redis for other features but turns the queue off', () => {
  process.env.REDIS_URL = 'redis://127.0.0.1:1'; // never connected to: only the flag is read
  try {
    delete process.env.QUEUE_ENABLED;
    assert.equal(queueEnabled(), true);
    process.env.QUEUE_ENABLED = 'false';
    assert.equal(queueEnabled(), false);
  } finally {
    delete process.env.REDIS_URL;
    delete process.env.QUEUE_ENABLED;
  }
});
