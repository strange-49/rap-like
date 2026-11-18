import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { configureDatabaseEnvironment, databaseEnabled, rideData, unique } from './helpers';

/**
 * Race-condition and rule tests against a REAL Postgres.
 * Skipped unless TEST_DATABASE_URL is set (see helpers.ts).
 */
describe('ride rules against a real database', { skip: !databaseEnabled }, () => {
  type Modules = {
    prisma: typeof import('../../src/common/database/prisma').prisma;
    service: typeof import('../../src/modules/rides/ride/ride.service');
    repo: typeof import('../../src/modules/rides/ride/ride.repository');
  };
  let m: Modules;

  const userIds: string[] = [];
  const rideIds: string[] = [];
  let customerId: string;
  let riderA: string;
  let riderB: string;

  async function createUser(role: 'CUSTOMER' | 'RIDER', extra: Record<string, unknown> = {}) {
    const user = await m.prisma.user.create({
      data: { username: unique(role.toLowerCase()), passwordHash: 'x', role, ...extra },
    });
    userIds.push(user.id);
    return user.id;
  }

  async function createRide(overrides: Record<string, unknown> = {}) {
    const ride = await m.prisma.ride.create({ data: rideData(customerId, overrides) as never });
    rideIds.push(ride.id);
    return ride;
  }

  before(async () => {
    configureDatabaseEnvironment();
    m = {
      prisma: (await import('../../src/common/database/prisma')).prisma,
      service: await import('../../src/modules/rides/ride/ride.service'),
      repo: await import('../../src/modules/rides/ride/ride.repository'),
    };
    customerId = await createUser('CUSTOMER');
    riderA = await createUser('RIDER', { isOnline: true });
    riderB = await createUser('RIDER', { isOnline: true });
  });

  after(async () => {
    await m.prisma.rideStartOtp.deleteMany({ where: { rideId: { in: rideIds } } });
    await m.prisma.ride.deleteMany({ where: { id: { in: rideIds } } });
    await m.prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await m.prisma.$disconnect();
  });

  test('two riders accepting the same ride at the same instant: exactly one wins', async () => {
    const ride = await createRide({ status: 'REQUESTED' });

    const results = await Promise.allSettled([
      m.service.assignRider(ride.id, riderA),
      m.service.assignRider(ride.id, riderB),
    ]);

    const winners = results.filter((r) => r.status === 'fulfilled');
    const losers = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    assert.equal(winners.length, 1, 'exactly one rider must get the ride');
    assert.equal(losers.length, 1);
    assert.equal((losers[0].reason as { code?: string }).code, 'RIDE_ALREADY_ASSIGNED');

    const saved = await m.prisma.ride.findUniqueOrThrow({ where: { id: ride.id } });
    assert.equal(saved.status, 'ASSIGNED');
    assert.ok([riderA, riderB].includes(saved.riderId as string));
  });

  test('retrying your own accept is harmless (idempotent)', async () => {
    const ride = await createRide({ status: 'REQUESTED' });
    const rider = await createUser('RIDER', { isOnline: true });
    const first = await m.service.assignRider(ride.id, rider);
    const again = await m.service.assignRider(ride.id, rider);
    assert.equal(first.id, again.id);
    assert.equal(again.riderId, rider);
  });

  test('one rider cannot accept two different rides concurrently across transactions', async () => {
    const rider = await createUser('RIDER', { isOnline: true });
    const rideOne = await createRide({ status: 'REQUESTED' });
    const rideTwo = await createRide({ status: 'REQUESTED', customerId: await createUser('CUSTOMER') });

    const results = await Promise.allSettled([
      m.service.assignRider(rideOne.id, rider),
      m.service.assignRider(rideTwo.id, rider),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    const rejected = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    assert.equal((rejected?.reason as { code?: string }).code, 'RIDER_BUSY');

    const saved = await m.prisma.ride.findMany({
      where: { id: { in: [rideOne.id, rideTwo.id] }, riderId: rider, status: { in: ['ASSIGNED', 'DRIVER_ARRIVING', 'IN_PROGRESS'] } },
    });
    assert.equal(saved.length, 1, 'the database must contain only one active ride for the rider');
  });

  test('an offline rider cannot accept; a busy rider cannot take a second ride', async () => {
    const offline = await createUser('RIDER', { isOnline: false });
    const open = await createRide({ status: 'REQUESTED' });
    await assert.rejects(() => m.service.assignRider(open.id, offline), { code: 'RIDER_OFFLINE' });

    const busy = await createUser('RIDER', { isOnline: true });
    const first = await createRide({ status: 'REQUESTED' });
    await m.service.assignRider(first.id, busy);
    const second = await createRide({ status: 'REQUESTED', customerId: await createUser('CUSTOMER') });
    await assert.rejects(() => m.service.assignRider(second.id, busy), { code: 'RIDER_BUSY' });
  });

  test('concurrent booking requests create exactly one active ride', async () => {
    const someone = await createUser('CUSTOMER');
    const attempts = await Promise.all(
      Array.from({ length: 8 }, () =>
        m.repo.createRideIfNoActive(someone, rideData(someone, { status: 'REQUESTED' }) as never),
      ),
    );
    const created = attempts.filter((ride) => ride !== null);
    created.forEach((ride) => ride && rideIds.push(ride.id));

    assert.equal(created.length, 1);
    assert.equal(await m.prisma.ride.count({ where: { customerId: someone } }), 1);
  });

  test('both completion confirmations: completes exactly once and records finalFare', async () => {
    const ride = await createRide({ status: 'IN_PROGRESS', startedAt: new Date() });

    const [rider, customer] = await Promise.all([
      m.repo.recordCompletionConfirmation(ride.id, 'rider'),
      m.repo.recordCompletionConfirmation(ride.id, 'customer'),
    ]);

    const completions = [rider, customer].filter((r) => r?.completedNow).length;
    assert.equal(completions, 1, 'the completion event must fire exactly once');

    const saved = await m.prisma.ride.findUniqueOrThrow({ where: { id: ride.id } });
    assert.equal(saved.status, 'COMPLETED');
    assert.equal(Number(saved.finalFare), 142);
    assert.ok(saved.completedAt);

    // A retry (double tap) must not "complete" again.
    const retry = await m.repo.recordCompletionConfirmation(ride.id, 'rider');
    assert.equal(retry?.completedNow, false);
  });

  test('generic PATCH cannot start a ride (OTP bypass) or reach protected states', async () => {
    const ride = await createRide({ status: 'DRIVER_ARRIVING', riderId: riderA, startOtpRequired: true });

    for (const status of ['IN_PROGRESS', 'ASSIGNED', 'COMPLETED', 'CANCELLED'] as const) {
      await assert.rejects(() => m.service.transitionRide(ride.id, status));
    }
    const saved = await m.prisma.ride.findUniqueOrThrow({ where: { id: ride.id } });
    assert.equal(saved.status, 'DRIVER_ARRIVING');
  });

  test('start OTP follows the per-ride setting: off = no code needed, on = code required', async () => {
    // OTP disabled (the default for customers): the rider just taps Start.
    const withoutOtp = await createRide({ status: 'DRIVER_ARRIVING', riderId: riderA, startOtpRequired: false });
    const started = await m.service.startRide(withoutOtp.id);
    assert.equal(started.status, 'IN_PROGRESS');

    // OTP enabled: no code / wrong code is refused, the right code starts the ride.
    const withOtp = await createRide({ status: 'DRIVER_ARRIVING', riderId: riderB, startOtpRequired: true });
    await assert.rejects(() => m.service.startRide(withOtp.id), { code: 'START_CODE_REQUIRED' });
    await assert.rejects(() => m.service.startRide(withOtp.id, '000000'), { code: 'INVALID_START_CODE' });

    const { otp } = await m.service.getCustomerStartOtp(withOtp.id, customerId);
    const ok = await m.service.startRide(withOtp.id, otp);
    assert.equal(ok.status, 'IN_PROGRESS');
  });

  test('start OTP brute force is blocked after 5 wrong codes, even for the right code', async () => {
    const ride = await createRide({ status: 'DRIVER_ARRIVING', riderId: riderA, startOtpRequired: true });
    const { otp } = await m.service.getCustomerStartOtp(ride.id, customerId);
    const wrong = otp === '111111' ? '222222' : '111111';

    for (let i = 0; i < 5; i += 1) {
      await assert.rejects(() => m.service.startRide(ride.id, wrong), { code: 'INVALID_START_CODE' });
    }
    await assert.rejects(() => m.service.startRide(ride.id, otp), { code: 'RATE_LIMITED' });
  });

  test('a customer cannot cancel a ride that is already in progress', async () => {
    const started = await createRide({ status: 'IN_PROGRESS', riderId: riderA });
    await assert.rejects(() => m.service.cancelRide(started.id, 'CUSTOMER'), { code: 'RIDE_ALREADY_STARTED' });

    const assigned = await createRide({ status: 'ASSIGNED', riderId: riderB });
    const cancelled = await m.service.cancelRide(assigned.id, 'CUSTOMER');
    assert.equal(cancelled.status, 'CANCELLED');
    assert.equal(cancelled.cancellationReason, 'CUSTOMER');
  });

  test('only online riders see open requests', async () => {
    const open = await createRide({ status: 'REQUESTED' });
    const online = await createUser('RIDER', { isOnline: true });
    const offline = await createUser('RIDER', { isOnline: false });

    assert.ok((await m.service.getRequestedRides(online)).some((r) => r.id === open.id));
    assert.deepEqual(await m.service.getRequestedRides(offline), []);
  });

  test('maintenance cancels stale requests and completes abandoned rides, atomically', async () => {
    const old = new Date(Date.now() - 20 * 60_000);
    const stale = await createRide({ status: 'REQUESTED', requestedAt: old });
    const abandoned = await createRide({
      status: 'IN_PROGRESS',
      riderId: riderA,
      riderCompletedAt: old,
    });

    // Two sweeps at once (two instances): each ride is handled exactly once overall.
    const [first, second] = await Promise.all([
      m.repo.expireStaleRequestedRides(),
      m.repo.expireStaleRequestedRides(),
    ]);
    const expiredIds = [...first, ...second].map((r) => r.id).filter((id) => id === stale.id);
    assert.equal(expiredIds.length, 1);

    const completed = await m.repo.autoCompleteAbandonedRides();
    assert.ok(completed.some((r) => r.id === abandoned.id));

    const savedStale = await m.prisma.ride.findUniqueOrThrow({ where: { id: stale.id } });
    assert.equal(savedStale.status, 'CANCELLED');
    assert.equal(savedStale.cancellationReason, 'SYSTEM');
    const savedAbandoned = await m.prisma.ride.findUniqueOrThrow({ where: { id: abandoned.id } });
    assert.equal(savedAbandoned.status, 'COMPLETED');
    assert.equal(Number(savedAbandoned.finalFare), 142);
  });
});
