import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canAccessRide } from '../src/common/authorization/ride-access';
import type { AuthContext } from '../src/common/auth/auth-context';
import type { RideEvent } from '../src/realtime/ride-events';
import { canReceiveRideEvent } from '../src/realtime/websocket-manager';

const companyAAdmin: AuthContext = { subjectId: 'admin-a', role: 'CLIENT_ADMIN', tenant: { tenantId: 't-a' } };
const customer: AuthContext = { subjectId: 'cust-1', role: 'CUSTOMER', tenant: null };
const rider: AuthContext = { subjectId: 'rider-1', role: 'RIDER', tenant: null };
const admin: AuthContext = { subjectId: 'root', role: 'ADMIN', tenant: null };

const rideOfCompanyB = { customerId: 'cust-b', riderId: 'rider-9', corporateAccountId: 'acct-b' };
const rideOfCompanyA = { customerId: 'cust-a', riderId: 'rider-9', corporateAccountId: 'acct-a' };

test('CLIENT_ADMIN of company A cannot access a ride of company B over HTTP', () => {
  // Regression: handleGetRide / handleCancelRide / PATCH had no tenant check.
  assert.equal(canAccessRide(rideOfCompanyB, companyAAdmin, 'acct-a'), false);
  assert.equal(canAccessRide(rideOfCompanyA, companyAAdmin, 'acct-a'), true);
});

test('CLIENT_ADMIN with no resolved company can access nothing', () => {
  assert.equal(canAccessRide(rideOfCompanyA, companyAAdmin, null), false);
  assert.equal(canAccessRide({ ...rideOfCompanyA, corporateAccountId: null }, companyAAdmin, null), false);
});

test('customers and riders only reach their own rides; ADMIN reaches all', () => {
  assert.equal(canAccessRide({ ...rideOfCompanyA, customerId: 'cust-1' }, customer), true);
  assert.equal(canAccessRide(rideOfCompanyA, customer), false);
  assert.equal(canAccessRide({ ...rideOfCompanyA, riderId: 'rider-1' }, rider), true);
  assert.equal(canAccessRide(rideOfCompanyA, rider), false);
  assert.equal(canAccessRide(rideOfCompanyB, admin), true);
});

function event(type: RideEvent['type'], data: Record<string, unknown>): RideEvent {
  return { type, rideId: 'r1', timestamp: new Date().toISOString(), data };
}

test('WebSocket: company A never receives company B ride events', () => {
  // Regression: canReceiveRideEvent used to return true for every CLIENT_ADMIN.
  const clientA = { authContext: companyAAdmin, corporateAccountId: 'acct-a' };
  assert.equal(canReceiveRideEvent(clientA, event('ride.started', { corporateAccountId: 'acct-b', customerId: 'cust-b' })), false);
  assert.equal(canReceiveRideEvent(clientA, event('ride.started', { corporateAccountId: 'acct-a', customerId: 'cust-a' })), true);
  // Non-corporate rides belong to nobody's company.
  assert.equal(canReceiveRideEvent(clientA, event('ride.started', { corporateAccountId: null, customerId: 'c' })), false);
});

test('WebSocket: a CLIENT_ADMIN socket without a resolved company receives nothing', () => {
  const unresolved = { authContext: companyAAdmin, corporateAccountId: null };
  assert.equal(canReceiveRideEvent(unresolved, event('ride.started', { corporateAccountId: null })), false);
  assert.equal(canReceiveRideEvent(unresolved, event('ride.started', { corporateAccountId: 'acct-a' })), false);
});

test('WebSocket: unauthenticated sockets receive nothing', () => {
  assert.equal(canReceiveRideEvent({ authContext: null, corporateAccountId: null }, event('ride.started', {})), false);
});

test('WebSocket: customers get only their own rides; riders only theirs plus new requests', () => {
  const customerClient = { authContext: customer, corporateAccountId: null };
  assert.equal(canReceiveRideEvent(customerClient, event('ride.assigned', { customerId: 'cust-1' })), true);
  assert.equal(canReceiveRideEvent(customerClient, event('ride.assigned', { customerId: 'someone-else' })), false);

  const riderClient = { authContext: rider, corporateAccountId: null };
  assert.equal(canReceiveRideEvent(riderClient, event('ride.requested', { customerId: 'x' })), true);
  assert.equal(canReceiveRideEvent(riderClient, event('ride.started', { riderId: 'rider-1' })), true);
  assert.equal(canReceiveRideEvent(riderClient, event('ride.started', { riderId: 'rider-2' })), false);
});

test('WebSocket: live rider location goes to the customer and admins, never to riders', () => {
  const locationEvent = event('ride.location', { customerId: 'cust-1', riderId: 'rider-1', corporateAccountId: null });
  assert.equal(canReceiveRideEvent({ authContext: customer, corporateAccountId: null }, locationEvent), true);
  assert.equal(canReceiveRideEvent({ authContext: admin, corporateAccountId: null }, locationEvent), true);
  assert.equal(canReceiveRideEvent({ authContext: rider, corporateAccountId: null }, locationEvent), false);
});
