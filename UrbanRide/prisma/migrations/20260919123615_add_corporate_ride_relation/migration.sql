-- AlterTable
ALTER TABLE "Ride" ADD COLUMN     "corporateAccountId" TEXT;

-- CreateIndex
CREATE INDEX "Ride_corporateAccountId_idx" ON "Ride"("corporateAccountId");

-- AddForeignKey
ALTER TABLE "Ride" ADD CONSTRAINT "Ride_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "CorporateAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
