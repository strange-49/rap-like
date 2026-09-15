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

export function updatePayment(
  id: string,
  data: Prisma.PaymentUpdateInput,
) {
  return prisma.payment.update({ where: { id }, data })
}