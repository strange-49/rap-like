import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, describe, test } from 'node:test';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const databaseEnabled = Boolean(testDatabaseUrl);

describe('rider assignment concurrency against PostgreSQL', { skip: !databaseEnabled }, () => {
  let prisma: typeof import('../../src/common/database/prisma').prisma;
  let repository: typeof import('../../src/modules/rides/ride/ride.repository');
  const userIds: string[] = [];
  const rideIds: string[] = [];

  async function createUser(role: 'CUSTOMER' | 'RIDER'): Promise<string> {
    const user = await prisma.user.create({
      data: { username: `${role.toLowerCase()}-${randomUUID()}`, passwordHash: 'test-only', role },
      select: { id: true },
    });
    userIds.push(user.id);
    return user.id;
  }

  async function createRide(customerId: string, status: 'REQUESTED' | 'ASSIGNED' = 'REQUESTED', riderId?: string) {
    const ride = await prisma.ride.create({
      data: {
        customerId,
        pickupAddress: 'test pickup',
        pickupLatitude: 12.9,
        pickupLongitude: 77.6,
        dropAddress: 'test drop',
        dropLatitude: 13,
        dropLongitude: 77.7,
        status,
        riderId,
      },
      select: { id: true },
    });
    rideIds.push(ride.id);
    return ride.id;
  }

  before(async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    prisma = (await import('../../src/common/database/prisma')).prisma;
    repository = await import('../../src/modules/rides/ride/ride.repository');
  });

  after(async () => {
    if (!databaseEnabled) return;
    await prisma.ride.deleteMany({ where: { id: { in: rideIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });

  test('one rider cannot win two different concurrent ride assignments', async () => {
    const riderId = await createUser('RIDER');
    const rideOne = await createRide(await createUser('CUSTOMER'));
    const rideTwo = await createRide(await createUser('CUSTOMER'));

    const results = await Promise.all([
      repository.assignRideToRiderIfAvailable(rideOne, riderId),
      repository.assignRideToRiderIfAvailable(rideTwo, riderId),
    ]);

    assert.equal(results.filter((result) => result.kind === 'assigned').length, 1);
    assert.equal(results.filter((result) => result.kind === 'busy').length, 1);
    const active = await prisma.ride.findMany({
      where: { id: { in: [rideOne, rideTwo] }, riderId, status: { in: ['ASSIGNED', 'DRIVER_ARRIVING', 'IN_PROGRESS'] } },
      select: { id: true },
    });
    assert.equal(active.length, 1);
  });

  test('concurrent riders produce one winner for a single ride', async () => {
    const riderOne = await createUser('RIDER');
    const riderTwo = await createUser('RIDER');
    const rideId = await createRide(await createUser('CUSTOMER'));

    const results = await Promise.all([
      repository.assignRideToRiderIfAvailable(rideId, riderOne),
      repository.assignRideToRiderIfAvailable(rideId, riderTwo),
    ]);

    assert.equal(results.filter((result) => result.kind === 'assigned').length, 1);
    assert.equal(results.filter((result) => result.kind === 'unavailable').length, 1);
  });

  test('partial unique index rejects a second active ride even outside the service', async () => {
    const riderId = await createUser('RIDER');
    const customerOne = await createUser('CUSTOMER');
    const customerTwo = await createUser('CUSTOMER');
    await createRide(customerOne, 'ASSIGNED', riderId);
    await assert.rejects(
      () => createRide(customerTwo, 'ASSIGNED', riderId),
      (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002',
    );
  });
});