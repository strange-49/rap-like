/*
  Warnings:

  - A unique constraint covering the columns `[tenantId]` on the table `CorporateAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "CorporateAccount" ADD COLUMN     "tenantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CorporateAccount_tenantId_key" ON "CorporateAccount"("tenantId");
