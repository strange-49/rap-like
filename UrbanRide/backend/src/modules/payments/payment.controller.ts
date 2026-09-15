import type { ServerResponse } from 'node:http';

import { AppError } from '../../common/errors/app-error';
import {
  createRazorpayOrder,
  verifyPaymentSignature,
} from './payment.service';

export async function handleCreatePaymentOrder(
  input: {
    rideId?: string;
  },
  response: ServerResponse,
): Promise<void> {
  if (!input.rideId?.trim()) {
    throw new AppError(
      'Ride ID is required.',
      400,
      'RIDE_ID_REQUIRED',
    );
  }

  const payment = await createRazorpayOrder(input.rideId);

  response.writeHead(201, {
    'content-type': 'application/json; charset=utf-8',
  });

  response.end(
    JSON.stringify({
      id: payment.id,
      rideId: payment.rideId,
      amount: payment.amount,
      status: payment.status,
      razorpayOrderId: payment.razorpayOrderId,
    }),
  );
}

export async function handleVerifyPayment(
  input: {
    paymentId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
  },
  response: ServerResponse,
): Promise<void> {
  const payment = await verifyPaymentSignature(
    input.paymentId ?? '',
    input.razorpayPaymentId ?? '',
    input.razorpaySignature ?? '',
  );

  response.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
  });

  response.end(
    JSON.stringify({
      id: payment.id,
      rideId: payment.rideId,
      amount: payment.amount,
      status: payment.status,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
    }),
  );
}