import assert from 'node:assert/strict';
import test from 'node:test';

import { RiderLocationStore } from '../src/realtime/rider-locations';

test('rider location store returns fresh positions and hides stale ones', () => {
  let now = 1_000;
  const store = new RiderLocationStore(() => now);
  const saved = store.set('rider-1', { latitude: 12.9, longitude: 77.6 });
  assert.equal(store.get('rider-1')?.updatedAt, saved.updatedAt);
  now += 120_001;
  assert.equal(store.get('rider-1'), null);
});

test('proximity check keeps riders without a known location eligible', () => {
  const store = new RiderLocationStore(() => 10_000);
  assert.equal(store.isKnownFarFrom('rider-unknown', { latitude: 0, longitude: 0 }, 1), false);
});
