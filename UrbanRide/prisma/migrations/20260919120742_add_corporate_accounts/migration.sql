-- CreateTable
CREATE TABLE "CorporateAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CorporateEmployee" (
    "id" TEXT NOT NULL,
    "corporateAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CorporateEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CorporateAccount_name_idx" ON "CorporateAccount"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CorporateEmployee_email_key" ON "CorporateEmployee"("email");

-- CreateIndex
CREATE INDEX "CorporateEmployee_corporateAccountId_idx" ON "CorporateEmployee"("corporateAccountId");

-- CreateIndex
CREATE INDEX "CorporateEmployee_active_idx" ON "CorporateEmployee"("active");

-- AddForeignKey
ALTER TABLE "CorporateEmployee" ADD CONSTRAINT "CorporateEmployee_corporateAccountId_fkey" FOREIGN KEY ("corporateAccountId") REFERENCES "CorporateAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
