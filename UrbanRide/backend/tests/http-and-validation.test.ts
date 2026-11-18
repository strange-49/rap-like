import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import type { IncomingMessage } from 'node:http';

import { TtlCache } from '../src/common/cache/ttl-cache';
import { CircuitBreaker } from '../src/common/resilience/circuit-breaker';
import { AppError } from '../src/common/errors/app-error';
import { parseJsonObject, readRawBody } from '../src/common/http/body';
import { allowedOrigins, isOriginAllowed } from '../src/config/cors';
import { RiderLocationStore } from '../src/realtime/rider-locations';
import { validateLocationReport, validateRequestRideInput } from '../src/modules/rides/ride/ride.validation';
import { sendError } from '../src/common/errors/http-error-handler';
import { RateLimitError } from '../src/common/security/rate-limit';

function fakeRequest(headers: Record<string, string> = {}): IncomingMessage & PassThrough {
  const stream = new PassThrough() as IncomingMessage & PassThrough;
  (stream as unknown as { headers: Record<string, string> }).headers = headers;
  return stream;
}

test('request body over the limit is rejected with 413', async () => {
  const request = fakeRequest();
  const pending = readRawBody(request, 10);
  request.write(Buffer.from('12345678901234567890'));
  await assert.rejects(pending, (error: unknown) => error instanceof AppError && error.statusCode === 413);
});

test('declared Content-Length over the limit is rejected before reading', async () => {
  const request = fakeRequest({ 'content-length': '999999' });
  await assert.rejects(readRawBody(request, 1024), (error: unknown) => error instanceof AppError && error.statusCode === 413);
});

test('multi-byte characters split across chunks are decoded correctly', async () => {
  const request = fakeRequest();
  const pending = readRawBody(request, 1024);
  const bytes = Buffer.from('{"name":"₹ ✓ नमस्ते"}', 'utf8');
  request.write(bytes.subarray(0, 11)); // cuts the ₹ (3 bytes) in half
  request.write(bytes.subarray(11));
  request.end();
  assert.equal(await pending, '{"name":"₹ ✓ नमस्ते"}');
});

test('bad JSON is a 400, not a 500', () => {
  assert.throws(() => parseJsonObject('{nope'), (e: unknown) => e instanceof AppError && e.statusCode === 400);
  assert.throws(() => parseJsonObject('[1,2]'), (e: unknown) => e instanceof AppError && e.statusCode === 400);
  assert.deepEqual(parseJsonObject(''), {});
});

test('rate-limit errors include Retry-After for clients', () => {
  const response = {
    headersSent: false,
    statusCode: 0,
    headers: {} as Record<string, string>,
    writeHead(status: number, headers: Record<string, string>) { this.statusCode = status; this.headers = headers; },
    end() { return this; },
  } as unknown as import('node:http').ServerResponse & { statusCode: number; headers: Record<string, string> };
  sendError(response, new RateLimitError(12));
  assert.equal(response.statusCode, 429);
  assert.equal(response.headers['retry-after'], '12');
});

test('ride request rejects identical pickup and drop, and oversized addresses', () => {
  const base = {
    pickupAddress: 'A', pickupLatitude: 12.97, pickupLongitude: 77.59,
    dropAddress: 'B', dropLatitude: 12.97, dropLongitude: 77.59, rideType: 'auto',
  };
  assert.throws(() => validateRequestRideInput(base), (e: unknown) => e instanceof AppError && e.code === 'PICKUP_EQUALS_DROP');
  assert.throws(
    () => validateRequestRideInput({ ...base, dropLatitude: 13.1, pickupAddress: 'x'.repeat(301) }),
    (e: unknown) => e instanceof AppError && e.code === 'ADDRESS_TOO_LONG',
  );
  assert.doesNotThrow(() => validateRequestRideInput({ ...base, dropLatitude: 13.1 }));
});

test('location reports are range-checked', () => {
  assert.deepEqual(validateLocationReport({ latitude: 12.9, longitude: 77.6 }), { latitude: 12.9, longitude: 77.6, heading: null, speedKmh: null });
  assert.throws(() => validateLocationReport({ latitude: 91, longitude: 0 }));
  assert.throws(() => validateLocationReport({ latitude: 0, longitude: 181 }));
  assert.throws(() => validateLocationReport({ latitude: 0, longitude: 0, heading: 400 }));
  assert.throws(() => validateLocationReport('nope'));
});

test('proximity dispatch only excludes riders that are KNOWN to be far away', () => {
  let now = 1_000_000;
  const store = new RiderLocationStore(() => now);
  const pickup = { latitude: 12.9716, longitude: 77.5946 }; // Bengaluru

  store.set('near', { latitude: 12.98, longitude: 77.6 });
  store.set('far', { latitude: 28.61, longitude: 77.21 }); // Delhi

  assert.equal(store.isKnownFarFrom('near', pickup, 10), false);
  assert.equal(store.isKnownFarFrom('far', pickup, 10), true);
  // No position reported (e.g. an older app version): still notified.
  assert.equal(store.isKnownFarFrom('unknown', pickup, 10), false);

  // A stale position is ignored rather than trusted.
  now += 5 * 60_000;
  assert.equal(store.isKnownFarFrom('far', pickup, 10), false);
});

test('CORS: production only allows configured origins; dev also allows localhost', () => {
  const prod = { NODE_ENV: 'production', CORS_ALLOWED_ORIGINS: 'https://app.example.com/' } as NodeJS.ProcessEnv;
  assert.equal(isOriginAllowed('https://app.example.com', prod), true);
  assert.equal(isOriginAllowed('http://localhost:5173', prod), false);
  assert.equal(isOriginAllowed('https://evil.example', prod), false);
  assert.equal(isOriginAllowed(undefined, prod), true, 'native apps send no Origin');

  const dev = { NODE_ENV: 'development' } as NodeJS.ProcessEnv;
  assert.equal(allowedOrigins(dev).has('http://localhost:5173'), true);
});

test('TtlCache expires entries and stays bounded', () => {
  let now = 0;
  const cache = new TtlCache<number>(1_000, 2, () => now);
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3); // evicts the oldest
  assert.equal(cache.get('a'), undefined);
  assert.equal(cache.get('c'), 3);
  now += 1_001;
  assert.equal(cache.get('c'), undefined);
});

test('circuit breaker opens after repeated failures, then probes again after the cooldown', () => {
  let now = 0;
  const breaker = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 30_000 }, () => now);

  assert.equal(breaker.isOpen(), false);
  breaker.recordFailure();
  breaker.recordFailure();
  assert.equal(breaker.isOpen(), false, 'two failures are not enough');
  breaker.recordFailure();
  assert.equal(breaker.isOpen(), true, 'third consecutive failure opens it');

  now += 29_999;
  assert.equal(breaker.isOpen(), true);
  now += 2;
  assert.equal(breaker.isOpen(), false, 'cooldown over: the next call is a probe');

  breaker.recordFailure();
  breaker.recordSuccess();
  breaker.recordFailure();
  breaker.recordFailure();
  assert.equal(breaker.isOpen(), false, 'a success resets the failure streak');
});
