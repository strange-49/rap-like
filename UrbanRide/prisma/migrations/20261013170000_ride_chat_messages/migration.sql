CREATE TABLE IF NOT EXISTS "RideChatMessage" (
  "id" TEXT PRIMARY KEY,
  "rideId" TEXT NOT NULL REFERENCES "Ride"("id") ON DELETE CASCADE,
  "senderId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "RideChatMessage_rideId_createdAt_idx" ON "RideChatMessage"("rideId", "createdAt");
