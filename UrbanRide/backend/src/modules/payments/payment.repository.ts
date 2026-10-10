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

export async function updatePaymentUnlessCaptured(
  id: string,
  data: Prisma.PaymentUpdateInput,
) {
  await prisma.payment.updateMany({
    where: { id, status: { not: 'CAPTURED' } },
    data,
  });
  return prisma.payment.findUnique({ where: { id } });
}
