-- Persist rider availability so push delivery is based on server-side state.
ALTER TABLE "User"
ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "User_role_isOnline_active_idx"
ON "User"("role", "isOnline", "active");
