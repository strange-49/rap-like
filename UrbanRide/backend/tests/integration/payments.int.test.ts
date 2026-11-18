import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { after, before, describe, test } from 'node:test';

import { configureDatabaseEnvironment, databaseEnabled, rideData, unique } from './helpers';
import { refundIdempotencyKey } from '../../src/modules/payments/refund-idempotency';

describe('payment refund transitions against a real database', { skip: !databaseEnabled }, () => {
  let prisma: typeof import('../../src/common/database/prisma').prisma;
  let repository: typeof import('../../src/modules/payments/payment.repository');
  let processPaymentWebhook: typeof import('../../src/modules/payments/payment.webhook').processPaymentWebhook;
  const rideIds: string[] = [];
  const paymentIds: string[] = [];
  const webhookSecret = 'refund-webhook-test-secret';

  async function createCapturedPayment() {
    const ride = await prisma.ride.create({ data: rideData(unique('customer'), { status: 'CANCELLED' }) as never });
    rideIds.push(ride.id);
    const payment = await prisma.payment.create({
      data: {
        rideId: ride.id,
        amount: 142,
        status: 'CAPTURED',
        razorpayOrderId: unique('order'),
        razorpayPaymentId: unique('payment'),
      },
    });
    paymentIds.push(payment.id);
    return payment;
  }

  function signedWebhook(event: string, entity: Record<string, unknown>) {
    const body = JSON.stringify({
      event,
      payload: event.startsWith('refund.') ? { refund: { entity } } : { payment: { entity } },
    });
    const signature = createHmac('sha256', webhookSecret).update(body).digest('hex');
    return { body, signature };
  }

  before(async () => {
    configureDatabaseEnvironment();
    process.env.RAZORPAY_WEBHOOK_SECRET = webhookSecret;
    prisma = (await import('../../src/common/database/prisma')).prisma;
    repository = await import('../../src/modules/payments/payment.repository');
    processPaymentWebhook = (await import('../../src/modules/payments/payment.webhook')).processPaymentWebhook;
  });

  after(async () => {
    await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
    await prisma.ride.deleteMany({ where: { id: { in: rideIds } } });
    await prisma.$disconnect();
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
  });

  test('concurrent refund workers share one durable attempt number', async () => {
    const payment = await createCapturedPayment();
    const claims = await Promise.all(Array.from({ length: 8 }, () => repository.claimPaymentRefund(payment.id)));
    assert.ok(claims.every((claim) => claim?.attempt === 1));
    assert.equal(new Set(claims.map((claim) => claim?.attempt)).size, 1);

    const saved = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    assert.equal(saved.status, 'REFUND_PENDING', 'claiming a refund does not report provider success');
    assert.equal(saved.refundAttempt, 1);
  });

  test('payment webhooks cannot overwrite a refund, and only refund.processed confirms it', async () => {
    const payment = await createCapturedPayment();
    const claim = await repository.claimPaymentRefund(payment.id);
    assert.equal(claim?.attempt, 1);

    const captured = signedWebhook('payment.captured', {
      order_id: payment.razorpayOrderId,
      id: payment.razorpayPaymentId,
      amount: 14_200,
      currency: 'INR',
    });
    await processPaymentWebhook(captured.body, captured.signature);
    let saved = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    assert.equal(saved.status, 'REFUND_PENDING');

    const receipt = refundIdempotencyKey(payment.id, claim!.attempt);
    const processed = signedWebhook('refund.processed', {
      payment_id: payment.razorpayPaymentId,
      id: unique('refund'),
      receipt,
      amount: 14_200,
    });
    const concurrentAuthorized = signedWebhook('payment.authorized', {
      order_id: payment.razorpayOrderId,
      id: payment.razorpayPaymentId,
      amount: 14_200,
      currency: 'INR',
    });
    await Promise.all([
      processPaymentWebhook(processed.body, processed.signature),
      processPaymentWebhook(concurrentAuthorized.body, concurrentAuthorized.signature),
    ]);

    saved = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
    assert.equal(saved.status, 'REFUNDED');
    const replay = await processPaymentWebhook(processed.body, processed.signature);
    assert.equal(replay.processed, false, 'a duplicate refund webhook is an idempotent no-op');
  });

  test('an explicit failed refund webhook opens a new attempt with a different idempotency key', async () => {
    const payment = await createCapturedPayment();
    const claim = await repository.claimPaymentRefund(payment.id);
    const failed = signedWebhook('refund.failed', {
      payment_id: payment.razorpayPaymentId,
      id: unique('refund'),
      receipt: refundIdempotencyKey(payment.id, claim!.attempt),
      amount: 14_200,
    });
    await processPaymentWebhook(failed.body, failed.signature);

    const retry = await repository.claimPaymentRefund(payment.id);
    assert.equal(retry?.attempt, 2);
    assert.notEqual(
      refundIdempotencyKey(payment.id, retry!.attempt),
      refundIdempotencyKey(payment.id, claim!.attempt),
    );
  });
});
