import assert from 'node:assert/strict';
import { test } from 'node:test';

import { refundIdempotencyKey } from '../src/modules/payments/refund-idempotency';

test('refund retries reuse a provider idempotency key; a new attempt gets a new key', () => {
  const firstAttempt = refundIdempotencyKey('pay_test_123', 1);
  assert.equal(refundIdempotencyKey('pay_test_123', 1), firstAttempt);
  assert.notEqual(refundIdempotencyKey('pay_test_123', 2), firstAttempt);
  assert.match(firstAttempt, /^[a-zA-Z0-9_-]{10,40}$/);
});
