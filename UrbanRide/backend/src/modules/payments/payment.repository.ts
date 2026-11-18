import { prisma } from '../../common/database/prisma'
import type { Prisma } from '../../generated/prisma/client'

export function createPayment(data: Prisma.PaymentCreateInput) {
  return prisma.payment.create({ data })
}

export function findPaymentByRideId(rideId: string) {
  return prisma.payment.findUnique({ where: { rideId } })
}

export function findPaymentByRazorpayOrderId(
  razorpayOrderId: string,
) {
  return prisma.payment.findUnique({
    where: { razorpayOrderId },
  })
}

export function findPaymentByRazorpayPaymentId(razorpayPaymentId: string) {
  return prisma.payment.findFirst({ where: { razorpayPaymentId } });
}

export function findPaymentById(id: string) {
  return prisma.payment.findUnique({ where: { id } })
}

export function findPaymentByRideForCustomer(
  rideId: string,
  customerId: string,
) {
  return prisma.payment.findFirst({
    where: { rideId, ride: { customerId } },
  })
}

export function findCustomerPaymentById(
  id: string,
  customerId: string,
) {
  return prisma.payment.findFirst({
    where: { id, ride: { customerId } },
  })
}

export function updatePayment(
  id: string,
  data: Prisma.PaymentUpdateInput,
) {
  return prisma.payment.update({ where: { id }, data })
}

export async function updatePaymentUnlessTerminal(
  id: string,
  data: Prisma.PaymentUpdateInput,
) {
  await prisma.payment.updateMany({
    where: { id, status: { notIn: ['CAPTURED', 'REFUND_PENDING', 'REFUND_FAILED', 'REFUNDED'] } },
    data,
  });
  return prisma.payment.findUnique({ where: { id } });
}

/**
 * Starts a refund attempt with a row-level compare-and-set. Concurrent workers
 * observing REFUND_PENDING reuse the same attempt number and provider key.
 */
export async function claimPaymentRefund(id: string): Promise<{ attempt: number } | null> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id } });
    if (!payment || payment.status === 'REFUNDED') return null;

    if (payment.status === 'REFUND_PENDING') {
      return { attempt: payment.refundAttempt };
    }
    if (payment.status !== 'CAPTURED' && payment.status !== 'REFUND_FAILED') return null;

    const result = await tx.payment.updateMany({
      where: { id, status: payment.status, refundAttempt: payment.refundAttempt },
      data: { status: 'REFUND_PENDING', refundAttempt: { increment: 1 } },
    });
    if (result.count !== 1) return null;
    return { attempt: payment.refundAttempt + 1 };
  });
}

/** Only provider-confirmed successful refunds become REFUNDED. */
export async function confirmPaymentRefund(id: string, attempt: number): Promise<boolean> {
  await prisma.payment.updateMany({
    where: { id, status: 'REFUND_PENDING', refundAttempt: attempt },
    data: { status: 'REFUNDED' },
  });
  const payment = await prisma.payment.findUnique({ where: { id }, select: { status: true } });
  return payment?.status === 'REFUNDED';
}

/** Explicit provider failure is recorded and can be retried as a new attempt. */
export async function failPaymentRefund(id: string, attempt: number): Promise<void> {
  await prisma.payment.updateMany({
    where: { id, status: 'REFUND_PENDING', refundAttempt: attempt },
    data: { status: 'REFUND_FAILED' },
  });
}

export async function resolvePaymentRefundWebhook(
  id: string,
  attempt: number,
  status: 'REFUNDED' | 'REFUND_FAILED',
): Promise<boolean> {
  const result = await prisma.payment.updateMany({
    where: { id, status: 'REFUND_PENDING', refundAttempt: attempt },
    data: { status },
  });
  return result.count === 1;
}

