-- CreateTable
CREATE TABLE "RiderDeviceToken" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiderDeviceToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RiderDeviceToken_token_key" ON "RiderDeviceToken"("token");

-- CreateIndex
CREATE INDEX "RiderDeviceToken_riderId_idx" ON "RiderDeviceToken"("riderId");
