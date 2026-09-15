import crypto from 'node:crypto';

import Razorpay from 'razorpay';

import { AppError } from '../../common/errors/app-error';
import { findRideById } from '../rides/ride/ride.repository';
import {
  createPayment,
  findPaymentByRideId,
  findPaymentById,
  updatePayment,
} from './payment.repository';

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

export async function createRazorpayOrder(rideId: string) {
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

  if (ride.status !== 'COMPLETED') {
    throw new AppError(
      'Payment can only be created for a completed ride.',
      400,
      'RIDE_NOT_COMPLETED',
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

  if (existingPayment) {
    throw new AppError(
      'A payment already exists for this ride.',
      409,
      'PAYMENT_ALREADY_EXISTS',
    );
  }

  const razorpay = getRazorpayClient();

  const order = await razorpay.orders.create({
    amount: Math.round(amountInRupees * 100),
    currency: 'INR',
    receipt: rideId,
  });

  return createPayment({
    rideId,
    amount: amountInRupees,
    status: 'PENDING',
    razorpayOrderId: order.id,
  });
}

export async function verifyPaymentSignature(
  paymentId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
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

  const payment = await findPaymentById(paymentId);

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

  return updatePayment(payment.id, {
    status: 'CAPTURED',
    razorpayPaymentId,
    razorpaySignature,
  });
}