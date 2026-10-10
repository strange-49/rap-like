import type { ServerResponse } from 'node:http';
import type { AuthContext } from '../../common/auth/auth-context';

import { AppError } from '../../common/errors/app-error';
import {
  createRazorpayOrder,
  verifyPaymentSignature,
  getCustomerPaymentStatus,
  getCustomerOutstandingPayment,
} from './payment.service';

export async function handleCreatePaymentOrder(
  input: {
    rideId?: string;
    mode?: 'ADVANCE' | 'POST_RIDE';
  },
  response: ServerResponse,
  authContext: AuthContext | null,
): Promise<void> {
  if (authContext?.role !== 'CUSTOMER') {
    throw new AppError('Customer authentication is required.', 401, 'UNAUTHORIZED');
  }
  if (!input.rideId?.trim()) {
    throw new AppError(
      'Ride ID is required.',
      400,
      'RIDE_ID_REQUIRED',
    );
  }

  if (
    input.mode !== 'ADVANCE' &&
    input.mode !== 'POST_RIDE'
  ) {
    throw new AppError(
      'Payment mode must be ADVANCE or POST_RIDE.',
      400,
      'INVALID_PAYMENT_MODE',
    );
  }

  const payment = await createRazorpayOrder(
    input.rideId,
    input.mode,
    authContext.subjectId,
  );

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
  authContext: AuthContext | null,
): Promise<void> {
  if (authContext?.role !== 'CUSTOMER') {
    throw new AppError('Customer authentication is required.', 401, 'UNAUTHORIZED');
  }
  const payment = await verifyPaymentSignature(
    input.paymentId ?? '',
    input.razorpayPaymentId ?? '',
    input.razorpaySignature ?? '',
    authContext.subjectId,
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

export async function handleGetPaymentStatus(
  rideId: string,
  response: ServerResponse,
  authContext: AuthContext | null,
): Promise<void> {
  if (authContext?.role !== 'CUSTOMER') {
    throw new AppError('Customer authentication is required.', 401, 'UNAUTHORIZED');
  }
  const payment = await getCustomerPaymentStatus(rideId, authContext.subjectId);
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payment));
}

export async function handleGetOutstandingPayment(
  response: ServerResponse,
  authContext: AuthContext | null,
): Promise<void> {
  if (authContext?.role !== 'CUSTOMER') {
    throw new AppError('Customer authentication is required.', 401, 'UNAUTHORIZED');
  }
  const result = await getCustomerOutstandingPayment(authContext.subjectId);
  response.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(result));
}
