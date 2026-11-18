-- Fail the migration clearly when existing data already violates the invariant.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Ride"
    WHERE "riderId" IS NOT NULL
      AND "status" IN ('ASSIGNED', 'DRIVER_ARRIVING', 'IN_PROGRESS')
    GROUP BY "riderId"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add Ride_one_active_per_rider: duplicate active rides exist for a rider';
  END IF;
END $$;

-- Database-level invariant, including writes that do not use the service lock.
CREATE UNIQUE INDEX "Ride_one_active_per_rider"
  ON "Ride" ("riderId")
  WHERE "status" IN ('ASSIGNED', 'DRIVER_ARRIVING', 'IN_PROGRESS');
