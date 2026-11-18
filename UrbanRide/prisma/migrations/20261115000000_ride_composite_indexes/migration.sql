-- Composite indexes that match how rides are actually queried:
--   customer history (customerId, newest first), rider history/active (riderId, status),
--   corporate history (corporateAccountId, newest first) and open-request lookups (status, requestedAt).

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Ride_customerId_requestedAt_idx" ON "Ride"("customerId", "requestedAt" DESC);
CREATE INDEX IF NOT EXISTS "Ride_riderId_status_idx" ON "Ride"("riderId", "status");
CREATE INDEX IF NOT EXISTS "Ride_corporateAccountId_requestedAt_idx" ON "Ride"("corporateAccountId", "requestedAt" DESC);
CREATE INDEX IF NOT EXISTS "Ride_status_requestedAt_idx" ON "Ride"("status", "requestedAt");

-- DropIndex (each one is now the leading column of a composite index above)
DROP INDEX IF EXISTS "Ride_customerId_idx";
DROP INDEX IF EXISTS "Ride_riderId_idx";
DROP INDEX IF EXISTS "Ride_corporateAccountId_idx";
DROP INDEX IF EXISTS "Ride_status_idx";
