-- CreateEnum
CREATE TYPE "RideStatus" AS ENUM ('REQUESTED', 'SEARCHING', 'ASSIGNED', 'DRIVER_ARRIVING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CancellationReason" AS ENUM ('CUSTOMER', 'RIDER', 'SYSTEM');

-- CreateTable
CREATE TABLE "Ride" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "riderId" TEXT,
    "status" "RideStatus" NOT NULL DEFAULT 'REQUESTED',
    "pickupAddress" TEXT NOT NULL,
    "pickupLatitude" DECIMAL(10,7) NOT NULL,
    "pickupLongitude" DECIMAL(10,7) NOT NULL,
    "dropAddress" TEXT NOT NULL,
    "dropLatitude" DECIMAL(10,7) NOT NULL,
    "dropLongitude" DECIMAL(10,7) NOT NULL,
    "estimatedDistance" DECIMAL(10,2),
    "estimatedFare" DECIMAL(10,2),
    "finalFare" DECIMAL(10,2),
    "cancellationReason" "CancellationReason",
    "cancelledAt" TIMESTAMP(3),
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ride_customerId_idx" ON "Ride"("customerId");

-- CreateIndex
CREATE INDEX "Ride_riderId_idx" ON "Ride"("riderId");

-- CreateIndex
CREATE INDEX "Ride_status_idx" ON "Ride"("status");

-- CreateIndex
CREATE INDEX "Ride_requestedAt_idx" ON "Ride"("requestedAt");
