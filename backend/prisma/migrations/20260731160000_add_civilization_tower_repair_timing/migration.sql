CREATE TYPE "CivilizationTowerWorkKind" AS ENUM ('BUILD', 'REPAIR');

ALTER TYPE "CivilizationEventType" ADD VALUE 'TOWER_REPAIR_STARTED' BEFORE 'TOWER_REPAIRED';

ALTER TABLE "civilization_towers"
ADD COLUMN "work_kind" "CivilizationTowerWorkKind";

UPDATE "civilization_towers"
SET "work_kind" = 'BUILD'
WHERE "status" = 'UNDER_CONSTRUCTION';

ALTER TABLE "civilization_towers"
DROP CONSTRAINT "civilization_towers_status_timestamps_check";

ALTER TABLE "civilization_towers"
ADD CONSTRAINT "civilization_towers_status_timestamps_check" CHECK (
    ("status" = 'UNDER_CONSTRUCTION' AND "work_kind" IS NOT NULL AND "construction_completes_at" IS NOT NULL AND "destroyed_at" IS NULL)
    OR ("status" = 'ACTIVE' AND "work_kind" IS NULL AND "destroyed_at" IS NULL)
    OR ("status" = 'DESTROYED' AND "work_kind" IS NULL AND "destroyed_at" IS NOT NULL)
    OR ("status" = 'CANCELLED' AND "work_kind" IS NULL)
);
