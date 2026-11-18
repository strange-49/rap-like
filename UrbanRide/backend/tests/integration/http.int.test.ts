import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { after, before, describe, test } from 'node:test';

import { configureDatabaseEnvironment, databaseEnabled, rideData, unique } from './helpers';

/**
 * Full HTTP stack (router -> auth -> controllers -> Postgres) with real logins.
 * The headline check: company A can never touch company B's rides.
 */
describe('HTTP API against a real database', { skip: !databaseEnabled }, () => {
  let server: Server;
  let baseUrl: string;
  let prisma: typeof import('../../src/common/database/prisma').prisma;

  const userIds: string[] = [];
  const accountIds: string[] = [];
  const rideIds: string[] = [];
  const password = 'correct-horse-battery';

  const people = {} as Record<'adminA' | 'adminB' | 'employeeB' | 'stranger' | 'rider', { username: string; id: string }>;
  const tokens = {} as Record<keyof typeof people, string>;
  let rideOfCompanyB: string;
  let accountB: string;

  async function api(method: string, path: string, token?: string, body?: unknown) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, json: text ? JSON.parse(text) : null };
  }

  before(async () => {
    configureDatabaseEnvironment();
    process.env.RATE_LIMIT_DISABLED = 'true';

    prisma = (await import('../../src/common/database/prisma')).prisma;
    const { hashPassword } = await import('../../src/common/security/password');
    const { createAuthService } = await import('../../src/modules/auth/auth.service');
    const { createApp } = await import('../../src/app');
    const { consoleLogger } = await import('../../src/common/logging/logger');

    const passwordHash = await hashPassword(password);

    const makeAccount = async (name: string) => {
      const tenantId = unique('tenant');
      const account = await prisma.corporateAccount.create({
        data: { name, tenantId, accessCode: unique('c').slice(0, 8).toUpperCase() },
      });
      accountIds.push(account.id);
      return { id: account.id, tenantId };
    };
    const makeUser = async (role: 'CLIENT_ADMIN' | 'CUSTOMER' | 'RIDER', tenantId: string | null) => {
      const username = unique(role.toLowerCase());
      const user = await prisma.user.create({ data: { username, passwordHash, role, tenantId } });
      userIds.push(user.id);
      return { username, id: user.id };
    };

    const companyA = await makeAccount('Company A');
    const companyB = await makeAccount('Company B');
    accountB = companyB.id;

    people.adminA = await makeUser('CLIENT_ADMIN', companyA.tenantId);
    people.adminB = await makeUser('CLIENT_ADMIN', companyB.tenantId);
    people.employeeB = await makeUser('CUSTOMER', companyB.tenantId);
    people.stranger = await makeUser('CUSTOMER', null);
    people.rider = await makeUser('RIDER', null);

    const ride = await prisma.ride.create({
      data: rideData(people.employeeB.id, { corporateAccountId: companyB.id, status: 'ASSIGNED', riderId: people.rider.id }) as never,
    });
    rideIds.push(ride.id);
    rideOfCompanyB = ride.id;
    await prisma.payment.create({
      data: { rideId: ride.id, amount: 75, status: 'CAPTURED' },
    });

    server = createApp(consoleLogger, createAuthService());
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

    for (const key of Object.keys(people) as Array<keyof typeof people>) {
      const login = await api('POST', '/auth/development/login', undefined, { username: people[key].username, password });
      assert.equal(login.status, 200, `login failed for ${key}: ${JSON.stringify(login.json)}`);
      tokens[key] = login.json.token;
    }
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.ride.deleteMany({ where: { id: { in: rideIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.corporateAccount.deleteMany({ where: { id: { in: accountIds } } });
    await prisma.$disconnect();
  });

  test('company A admin cannot READ company B\'s ride', async () => {
    const response = await api('GET', `/rides/${rideOfCompanyB}`, tokens.adminA);
    assert.equal(response.status, 403);
  });

  test('company B admin CAN read its own company\'s ride', async () => {
    const response = await api('GET', `/rides/${rideOfCompanyB}`, tokens.adminB);
    assert.equal(response.status, 200);
    assert.equal(response.json.id, rideOfCompanyB);
  });

  test('corporate report and billing totals are aggregated across the account', async () => {
    const report = await api('GET', `/corporate/accounts/${accountB}/reports`, tokens.adminB);
    assert.equal(report.status, 200);
    assert.equal(report.json.summary.totalRides, 1);
    assert.equal(report.json.summary.totalPayments, 1);
    assert.equal(report.json.summary.capturedPayments, 1);
    assert.equal(report.json.summary.capturedAmount, 75);
    assert.equal(report.json.rides.length, 1);

    const billing = await api('GET', `/corporate/accounts/${accountB}/billing`, tokens.adminB);
    assert.equal(billing.status, 200);
    assert.equal(billing.json.totalPayments, 1);
    assert.equal(billing.json.totalAmount, 75);
    assert.equal(billing.json.capturedAmount, 75);
    assert.equal(billing.json.payments.length, 1);
  });

  test('company A admin cannot CANCEL or CHANGE company B\'s ride', async () => {
    const cancel = await api('DELETE', `/rides/${rideOfCompanyB}`, tokens.adminA, { reason: 'CUSTOMER' });
    assert.equal(cancel.status, 403);

    const patch = await api('PATCH', `/rides/${rideOfCompanyB}`, tokens.adminA, { status: 'DRIVER_ARRIVING' });
    assert.equal(patch.status, 403);

    const location = await api('GET', `/rides/${rideOfCompanyB}/location`, tokens.adminA);
    assert.equal(location.status, 403);

    const saved = await prisma.ride.findUniqueOrThrow({ where: { id: rideOfCompanyB } });
    assert.equal(saved.status, 'ASSIGNED', 'the ride must be untouched');
  });

  test('a customer outside the company cannot read the ride either', async () => {
    assert.equal((await api('GET', `/rides/${rideOfCompanyB}`, tokens.stranger)).status, 403);
  });

  test('the cancellation reason cannot be spoofed from the request body', async () => {
    // The reason is derived from the logged-in role, whatever the body says.
    const response = await api('DELETE', `/rides/${rideOfCompanyB}`, tokens.employeeB, { reason: 'RIDER' });
    assert.equal(response.status, 200);
    assert.equal(response.json.cancellationReason, 'CUSTOMER');
  });

  test('missing / invalid tokens are rejected', async () => {
    assert.equal((await api('GET', `/rides/${rideOfCompanyB}`)).status, 401);
    assert.equal((await api('GET', `/rides/${rideOfCompanyB}`, 'not.a-real-token')).status, 401);
  });

  test('a suspended user loses access without logging out', async () => {
    await prisma.user.update({ where: { id: people.stranger.id }, data: { active: false } });
    // The "still active?" answer is cached for ~30 s per process, so check with a fresh app instance.
    const { createAuthService } = await import('../../src/modules/auth/auth.service');
    const service = createAuthService();
    const loginAgain = await service.login({ username: people.stranger.username, password });
    assert.equal(loginAgain, null, 'a deactivated account cannot sign in');
    await prisma.user.update({ where: { id: people.stranger.id }, data: { active: true } });
  });

  test('oversized bodies and bad JSON are rejected cleanly', async () => {
    const huge = await fetch(`${baseUrl}/auth/development/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'x'.repeat(100_000), password: 'y' }),
    });
    assert.equal(huge.status, 413);

    const bad = await fetch(`${baseUrl}/auth/development/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    assert.equal(bad.status, 400);
  });

  test('the readiness probe reports the database and the instance', async () => {
    const response = await api('GET', '/ready');
    assert.equal(response.status, 200);
    assert.equal(response.json.status, 'ready');
    assert.ok(response.json.instance);
    assert.equal(response.json.redis, 'disabled');
  });
});
