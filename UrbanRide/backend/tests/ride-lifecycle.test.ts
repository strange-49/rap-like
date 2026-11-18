import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  GENERIC_PATCH_TARGETS,
  canTransition,
  predecessorsOf,
} from '../src/modules/rides/ride/ride.lifecycle';

test('generic PATCH can never skip the start OTP, assignment, completion or cancellation checks', () => {
  // Regression: PATCH /rides/:id {status:"IN_PROGRESS"} used to start a ride
  // without the OTP, and ASSIGNED could be set without a rider.
  for (const status of ['IN_PROGRESS', 'ASSIGNED', 'COMPLETED', 'CANCELLED'] as const) {
    assert.equal(GENERIC_PATCH_TARGETS.includes(status), false, `${status} must use its dedicated endpoint`);
  }
});

test('only forward transitions are legal', () => {
  assert.equal(canTransition('REQUESTED', 'ASSIGNED'), true);
  assert.equal(canTransition('DRIVER_ARRIVING', 'IN_PROGRESS'), true);
  assert.equal(canTransition('ASSIGNED', 'IN_PROGRESS'), false);
  assert.equal(canTransition('COMPLETED', 'CANCELLED'), false);
  assert.equal(canTransition('CANCELLED', 'REQUESTED'), false);
});

test('predecessorsOf drives the atomic compare-and-set guard', () => {
  assert.deepEqual(predecessorsOf('ASSIGNED').sort(), ['REQUESTED', 'SEARCHING']);
  assert.deepEqual(predecessorsOf('IN_PROGRESS'), ['DRIVER_ARRIVING']);
  assert.deepEqual(predecessorsOf('REQUESTED'), []);
  // A finished ride can never be cancelled.
  assert.equal(predecessorsOf('CANCELLED').includes('COMPLETED'), false);
});
