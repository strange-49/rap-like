import { generateKeyPairSync, randomUUID } from 'node:crypto';

/**
 * Integration tests need a REAL Postgres (and, for the Redis tests, a real Redis).
 * They are skipped unless the matching variable is set, so `pnpm test` stays fast
 * and dependency-free:
 *
 *   TEST_DATABASE_URL=postgresql://user:pass@localhost:5432/urbanride_test
 *   TEST_REDIS_URL=redis://localhost:6379/1
 *
 * Use a throw-away database: the tests create and delete their own rows, but never
 * point TEST_DATABASE_URL at your real development database.
 */
export const databaseEnabled = Boolean(process.env.TEST_DATABASE_URL);
export const redisEnabledForTests = Boolean(process.env.TEST_REDIS_URL);

/** Must run BEFORE the application modules are imported (they read env at import time). */
export function configureDatabaseEnvironment(): void {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

  // Importing the ride service pulls in Firebase; give it a throw-away key so no
  // real credentials are needed (no push notification is ever sent in tests).
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  process.env.FIREBASE_PROJECT_ID = 'integration-test';
  process.env.FIREBASE_CLIENT_EMAIL = 'test@integration-test.iam.gserviceaccount.com';
  process.env.FIREBASE_PRIVATE_KEY = privateKey;
  process.env.NODE_ENV = 'test';
  delete process.env.REDIS_URL;
}

export const unique = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;

export function rideData(customerId: string, overrides: Record<string, unknown> = {}) {
  return {
    customerId,
    pickupAddress: 'MG Road, Bengaluru',
    pickupLatitude: 12.9756,
    pickupLongitude: 77.6066,
    dropAddress: 'Indiranagar, Bengaluru',
    dropLatitude: 12.9784,
    dropLongitude: 77.6408,
    estimatedDistance: 4.8,
    estimatedFare: 142,
    startOtpRequired: false,
    ...overrides,
  };
}
