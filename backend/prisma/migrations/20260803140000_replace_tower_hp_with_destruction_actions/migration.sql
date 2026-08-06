ALTER TYPE "CivilizationEventType" ADD VALUE IF NOT EXISTS 'TOWER_ATTACKED';

ALTER TABLE "civilization_towers"
  RENAME COLUMN "hit_points" TO "destruction_progress_actions";

ALTER TABLE "civilization_towers"
  RENAME COLUMN "maximum_hit_points" TO "destruction_required_actions";

ALTER TABLE "civilization_towers"
  ALTER COLUMN "destruction_progress_actions" SET DEFAULT 0;

UPDATE "civilization_towers"
SET
  "destruction_required_actions" = 3,
  "destruction_progress_actions" = CASE WHEN "status" = 'DESTROYED' THEN 3 ELSE 0 END;

UPDATE "civilization_games"
SET "settings_json" = jsonb_set(
  jsonb_set(
    "settings_json",
    '{tower,destructionRequiredActions}',
    '3'::jsonb,
    true
  ),
  '{catapult,damage}',
  '2'::jsonb,
  true
);
