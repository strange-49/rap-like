import crypto from 'node:crypto';

import Razorpay from 'razorpay';

import { AppError } from '../../common/errors/app-error';
import {
  findCustomerOutstandingPayment,
  findRideById,
} from '../rides/ride/ride.repository';
import {
  createPayment,
  findPaymentByRideId,
  findPaymentByRideForCustomer,
  findCustomerPaymentById,
  updatePayment,
  updatePaymentUnlessCaptured,
} from './payment.repository';

export type PaymentMode = 'ADVANCE' | 'POST_RIDE';

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId) {
    throw new AppError(
      'Razorpay key ID is not configured.',
      500,
      'RAZORPAY_KEY_ID_NOT_CONFIGURED',
    );
  }

  if (!keySecret) {
    throw new AppError(
      'Razorpay key secret is not configured.',
      500,
      'RAZORPAY_KEY_SECRET_NOT_CONFIGURED',
    );
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

function getRazorpaySecret() {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    throw new AppError(
      'Razorpay key secret is not configured.',
      500,
      'RAZORPAY_KEY_SECRET_NOT_CONFIGURED',
    );
  }

  return keySecret;
}

export async function createRazorpayOrder(
  rideId: string,
  mode: PaymentMode,
  customerId: string,
) {
  if (!rideId.trim()) {
    throw new AppError(
      'Ride ID is required.',
      400,
      'RIDE_ID_REQUIRED',
    );
  }

  const ride = await findRideById(rideId);

  if (!ride) {
    throw new AppError(
      'Ride not found.',
      404,
      'RIDE_NOT_FOUND',
    );
  }
  if (ride.customerId !== customerId) {
    throw new AppError('You can only pay for your own ride.', 403, 'FORBIDDEN');
  }

  if (
    mode === 'POST_RIDE' &&
    ride.status !== 'COMPLETED'
  ) {
    throw new AppError(
      'Post-ride payment can only be created after the ride is completed.',
      400,
      'RIDE_NOT_COMPLETED',
    );
  }

  if (
    mode === 'ADVANCE' &&
    ride.status === 'COMPLETED'
  ) {
    throw new AppError(
      'Advance payment is only available before the ride is completed.',
      400,
      'RIDE_ALREADY_COMPLETED',
    );
  }

  const amount = ride.finalFare ?? ride.estimatedFare;

  if (amount === null) {
    throw new AppError(
      'Ride fare is not available.',
      400,
      'RIDE_FARE_NOT_AVAILABLE',
    );
  }

  const amountInRupees = Number(amount);

  if (!Number.isFinite(amountInRupees) || amountInRupees <= 0) {
    throw new AppError(
      'Ride fare is invalid.',
      400,
      'INVALID_RIDE_FARE',
    );
  }

  const existingPayment = await findPaymentByRideId(rideId);
  if (existingPayment?.status === 'CAPTURED') {
    throw new AppError(
      'This ride is already paid.',
      409,
      'PAYMENT_ALREADY_CAPTURED',
    );
  }
  if (existingPayment && existingPayment.status !== 'FAILED') {
    if (existingPayment.mode !== mode) {
      throw new AppError('A payment attempt is already active in another mode.', 409, 'PAYMENT_ATTEMPT_ACTIVE');
    }
    return existingPayment;
  }

  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: Math.round(amountInRupees * 100),
    currency: 'INR',
    receipt: rideId,
  });

  const paymentData = {
    ride: { connect: { id: rideId } },
    amount: amountInRupees,
    mode,
    status: 'PENDING',
    razorpayOrderId: order.id,
  } as const;

  return existingPayment
    ? updatePayment(existingPayment.id, {
        amount: amountInRupees,
        mode,
        status: 'PENDING',
        razorpayOrderId: order.id,
        razorpayPaymentId: null,
        razorpaySignature: null,
      })
    : createPayment(paymentData);
}

export async function verifyPaymentSignature(
  paymentId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  customerId: string,
) {
  if (!paymentId.trim()) {
    throw new AppError(
      'Payment ID is required.',
      400,
      'PAYMENT_ID_REQUIRED',
    );
  }

  if (!razorpayPaymentId.trim()) {
    throw new AppError(
      'Razorpay payment ID is required.',
      400,
      'RAZORPAY_PAYMENT_ID_REQUIRED',
    );
  }

  if (!razorpaySignature.trim()) {
    throw new AppError(
      'Razorpay signature is required.',
      400,
      'RAZORPAY_SIGNATURE_REQUIRED',
    );
  }

  const payment = await findCustomerPaymentById(paymentId, customerId);

  if (!payment) {
    throw new AppError(
      'Payment not found.',
      404,
      'PAYMENT_NOT_FOUND',
    );
  }

  if (!payment.razorpayOrderId) {
    throw new AppError(
      'Razorpay order ID is missing.',
      400,
      'RAZORPAY_ORDER_ID_MISSING',
    );
  }

  if (payment.status === 'CAPTURED') {
    if (payment.razorpayPaymentId === razorpayPaymentId) return payment;
    throw new AppError(
      'Payment has already been captured.',
      409,
      'PAYMENT_ALREADY_CAPTURED',
    );
  }

  const secret = getRazorpaySecret();

  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${payment.razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const signaturesMatch =
    generatedSignature.length === razorpaySignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(razorpaySignature),
    );

  if (!signaturesMatch) {
    throw new AppError(
      'Payment signature verification failed.',
      400,
      'INVALID_PAYMENT_SIGNATURE',
    );
  }

  const razorpay = getRazorpayClient();
  const providerPayment = await razorpay.payments.fetch(razorpayPaymentId);
  if (
    providerPayment.order_id !== payment.razorpayOrderId ||
    providerPayment.amount !== Math.round(Number(payment.amount) * 100) ||
    providerPayment.currency !== 'INR'
  ) {
    throw new AppError('Razorpay payment does not match the ride order.', 400, 'PAYMENT_MISMATCH');
  }

  const nextStatus = providerPayment.status === 'captured'
    ? 'CAPTURED'
    : providerPayment.status === 'authorized'
      ? 'AUTHORIZED'
      : providerPayment.status === 'failed'
        ? 'FAILED'
        : 'PENDING';

  return (await updatePaymentUnlessCaptured(payment.id, {
    status: nextStatus,
    razorpayPaymentId,
    razorpaySignature,
  }))!;
}

export async function getCustomerPaymentStatus(
  rideId: string,
  customerId: string,
) {
  const payment = await findPaymentByRideForCustomer(rideId, customerId);
  return payment && {
    id: payment.id,
    rideId: payment.rideId,
    amount: payment.amount,
    mode: payment.mode,
    status: payment.status,
  };
}

export async function getCustomerOutstandingPayment(customerId: string) {
  const ride = await findCustomerOutstandingPayment(customerId);
  if (!ride) return null;
  return {
    rideId: ride.id,
    paymentStatus: ride.payment?.status ?? 'UNPAID',
    amount: ride.payment?.amount ?? null,
  };
}
