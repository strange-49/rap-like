-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('ADVANCE', 'POST_RIDE');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "mode" "PaymentMode" NOT NULL DEFAULT 'POST_RIDE';
