-- Persist customer profile details and support corporate employee activation.
ALTER TABLE "User"
  ADD COLUMN "fullName" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "countryCode" TEXT;

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

ALTER TABLE "CorporateAccount" ADD COLUMN "accessCode" TEXT;
UPDATE "CorporateAccount"
SET "accessCode" = 'UR-' || upper(substr(md5(random()::text || "id" || clock_timestamp()::text), 1, 10))
WHERE "accessCode" IS NULL;
ALTER TABLE "CorporateAccount" ALTER COLUMN "accessCode" SET NOT NULL;
CREATE UNIQUE INDEX "CorporateAccount_accessCode_key" ON "CorporateAccount"("accessCode");

ALTER TABLE "CorporateEmployee"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "invitationTokenHash" TEXT,
  ADD COLUMN "invitationExpiresAt" TIMESTAMP(3),
  ADD COLUMN "activatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "CorporateEmployee_userId_key" ON "CorporateEmployee"("userId");
CREATE UNIQUE INDEX "CorporateEmployee_invitationTokenHash_key" ON "CorporateEmployee"("invitationTokenHash");
ALTER TABLE "CorporateEmployee"
  ADD CONSTRAINT "CorporateEmployee_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
