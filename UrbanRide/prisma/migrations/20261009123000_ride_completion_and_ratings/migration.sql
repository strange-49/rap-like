ALTER TABLE "Ride"
ADD COLUMN "riderCompletedAt" TIMESTAMP(3),
ADD COLUMN "customerCompletedAt" TIMESTAMP(3);

CREATE TABLE "RideRating" (
    "id" TEXT NOT NULL,
    "rideId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RideRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RideRating_rideId_key" ON "RideRating"("rideId");
CREATE INDEX "RideRating_customerId_idx" ON "RideRating"("customerId");
CREATE INDEX "RideRating_riderId_idx" ON "RideRating"("riderId");

ALTER TABLE "RideRating"
ADD CONSTRAINT "RideRating_rideId_fkey"
FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RideStartOtp" (
    "rideId" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RideStartOtp_pkey" PRIMARY KEY ("rideId")
);

ALTER TABLE "RideStartOtp"
ADD CONSTRAINT "RideStartOtp_rideId_fkey"
FOREIGN KEY ("rideId") REFERENCES "Ride"("id") ON DELETE CASCADE ON UPDATE CASCADE;
