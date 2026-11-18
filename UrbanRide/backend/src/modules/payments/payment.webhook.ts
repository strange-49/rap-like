import crypto from 'node:crypto'

import { AppError } from '../../common/errors/app-error'
import { consoleLogger } from '../../common/logging/logger'
import { captureAuthorizedPayment } from './payment.service'
import {
  findPaymentByRazorpayPaymentId,
  findPaymentByRazorpayOrderId,
  resolvePaymentRefundWebhook,
  updatePaymentUnlessTerminal,
} from './payment.repository'
import { refundIdempotencyKey } from './refund-idempotency';

function getWebhookSecret() {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!secret) {
    throw new AppError(
      'Razorpay webhook secret is not configured.',
      500,
      'RAZORPAY_WEBHOOK_SECRET_NOT_CONFIGURED',
    )
  }

  return secret
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
) {
  const secret = getWebhookSecret()

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  return (
    expectedSignature.length === signature.length &&
    crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    )
  )
}

export async function processPaymentWebhook(
  rawBody: string,
  signature: string,
) {
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw new AppError(
      'Invalid Razorpay webhook signature.',
      400,
      'INVALID_RAZORPAY_WEBHOOK_SIGNATURE',
    )
  }

  const event = JSON.parse(rawBody)

  const refundEntity = event.payload?.refund?.entity
  if (event.event === 'refund.processed' || event.event === 'refund.failed') {
    if (!refundEntity?.payment_id || !refundEntity?.receipt || !Number.isInteger(refundEntity?.amount)) {
      return { processed: false }
    }
    const payment = await findPaymentByRazorpayPaymentId(refundEntity.payment_id)
    if (!payment || refundEntity.receipt !== refundIdempotencyKey(payment.id, payment.refundAttempt)) {
      return { processed: false }
    }
    if (refundEntity.amount !== Math.round(Number(payment.amount) * 100)) {
      throw new AppError('Razorpay refund webhook amount does not match the stored payment.', 400, 'REFUND_MISMATCH')
    }

    const status = event.event === 'refund.processed' ? 'REFUNDED' : 'REFUND_FAILED'
    const changed = await resolvePaymentRefundWebhook(payment.id, payment.refundAttempt, status)
    return { processed: changed, event: event.event, paymentId: payment.id }
  }

  const paymentEntity = event.payload?.payment?.entity

  if (!paymentEntity) {
    return {
      processed: false,
    }
  }

  const razorpayOrderId = paymentEntity.order_id
  const razorpayPaymentId = paymentEntity.id

  if (!razorpayOrderId || !razorpayPaymentId) {
    return {
      processed: false,
    }
  }

  const payment = await findPaymentByRazorpayOrderId(
    razorpayOrderId,
  )

  if (!payment) {
    return {
      processed: false,
    }
  }

  if (
    paymentEntity.amount !== Math.round(Number(payment.amount) * 100) ||
    paymentEntity.currency !== 'INR'
  ) {
    throw new AppError('Razorpay webhook payment does not match the stored order amount or currency.', 400, 'PAYMENT_MISMATCH')
  }

  if (payment.status === 'CAPTURED') {
    return { processed: true, event: event.event, paymentId: payment.id }
  }
  if (payment.status === 'REFUND_PENDING' || payment.status === 'REFUND_FAILED' || payment.status === 'REFUNDED') {
    return { processed: true, event: event.event, paymentId: payment.id }
  }

  // Webhooks can arrive out of order and a customer may retry after a failed
  // attempt. A late "failed" for an OLD attempt must never overwrite a newer
  // authorized/pending attempt, so it is only applied when it concerns the
  // payment we currently track (or nothing has been attached yet).
  const concernsCurrentAttempt =
    !payment.razorpayPaymentId || payment.razorpayPaymentId === razorpayPaymentId

  switch (event.event) {
    case 'payment.authorized': {
      await updatePaymentUnlessTerminal(payment.id, {
        status: 'AUTHORIZED',
        razorpayPaymentId,
      })
      // Only needed when the Razorpay account is not set to auto-capture.
      if (process.env.RAZORPAY_MANUAL_CAPTURE === 'true') {
        try {
          await captureAuthorizedPayment(razorpayPaymentId, Number(payment.amount))
        } catch (error) {
          // "Already captured" is expected when auto-capture is on; the
          // payment.captured webhook then finalizes the status.
          consoleLogger.error('payment.capture.failed', {
            paymentId: payment.id,
            error: String(error),
          })
        }
      }
      break
    }

    case 'payment.captured':
      await updatePaymentUnlessTerminal(payment.id, {
        status: 'CAPTURED',
        razorpayPaymentId,
      })
      break

    case 'payment.failed':
      if (!concernsCurrentAttempt || payment.status === 'AUTHORIZED') {
        break
      }
      await updatePaymentUnlessTerminal(payment.id, {
        status: 'FAILED',
        razorpayPaymentId,
      })
      break

    default:
      return {
        processed: false,
      }
  }

  return {
    processed: true,
    event: event.event,
    paymentId: payment.id,
  }
}
