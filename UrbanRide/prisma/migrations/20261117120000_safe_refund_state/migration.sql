-- Keep an in-flight provider refund distinct from a confirmed refund.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_PENDING';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REFUND_FAILED';

ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "refundAttempt" INTEGER NOT NULL DEFAULT 0;
