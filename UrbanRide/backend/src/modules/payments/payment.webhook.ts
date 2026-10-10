import crypto from 'node:crypto'

import { AppError } from '../../common/errors/app-error'
import {
  findPaymentByRazorpayOrderId,
  updatePaymentUnlessCaptured,
} from './payment.repository'

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

  switch (event.event) {
    case 'payment.authorized':
      await updatePaymentUnlessCaptured(payment.id, {
        status: 'AUTHORIZED',
        razorpayPaymentId,
      })
      break

    case 'payment.captured':
      await updatePaymentUnlessCaptured(payment.id, {
        status: 'CAPTURED',
        razorpayPaymentId,
      })
      break

    case 'payment.failed':
      await updatePaymentUnlessCaptured(payment.id, {
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
