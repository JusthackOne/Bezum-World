ALTER TYPE "CivilizationActionType" ADD VALUE IF NOT EXISTS 'CATAPULT_ATTACK';
ALTER TYPE "CivilizationEventType" ADD VALUE IF NOT EXISTS 'REWARD_CLAIMED';
ALTER TYPE "CivilizationEventType" ADD VALUE IF NOT EXISTS 'CATAPULT_ATTACKED';

ALTER TABLE "civilization_spawn_points" ADD COLUMN IF NOT EXISTS "team_id" TEXT;

-- The former shared spawn is assigned to TEAM_A. TEAM_B receives a distinct
-- deterministic passable tile until an administrator reviews the draft map.
UPDATE "civilization_spawn_points" AS "spawn"
SET "team_id" = "team"."id"
FROM "civilization_teams" AS "team"
WHERE "team"."game_id" = "spawn"."game_id"
  AND "team"."side" = 'TEAM_A';

-- Remove the former one-spawn-per-game constraint before inserting TEAM_B.
DROP INDEX IF EXISTS "civilization_spawn_points_game_id_key";

INSERT INTO "civilization_spawn_points" ("id", "game_id", "team_id", "tile_id", "created_at")
SELECT
  gen_random_uuid(),
  "game"."id",
  "team"."id",
  "candidate"."id",
  CURRENT_TIMESTAMP
FROM "civilization_games" AS "game"
JOIN "civilization_teams" AS "team"
  ON "team"."game_id" = "game"."id" AND "team"."side" = 'TEAM_B'
JOIN LATERAL (
  SELECT "tile"."id"
  FROM "civilization_tiles" AS "tile"
  LEFT JOIN "civilization_spawn_points" AS "existing" ON "existing"."tile_id" = "tile"."id"
  LEFT JOIN "civilization_buildings" AS "building" ON "building"."tile_id" = "tile"."id"
  WHERE "tile"."game_id" = "game"."id"
    AND "tile"."terrain_type" = 'GROUND'
    AND "existing"."id" IS NULL
    AND "building"."id" IS NULL
  ORDER BY
    CASE WHEN "tile"."owner_team_id" = "team"."id" THEN 0 ELSE 1 END,
    "tile"."q" DESC,
    "tile"."r" DESC,
    "tile"."id"
  LIMIT 1
) AS "candidate" ON TRUE
WHERE NOT EXISTS (
  SELECT 1
  FROM "civilization_spawn_points" AS "team_spawn"
  WHERE "team_spawn"."team_id" = "team"."id"
);

ALTER TABLE "civilization_spawn_points" ALTER COLUMN "team_id" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "civilization_spawn_points_team_id_key"
  ON "civilization_spawn_points"("team_id");
CREATE UNIQUE INDEX IF NOT EXISTS "civilization_spawn_points_game_id_team_id_key"
  ON "civilization_spawn_points"("game_id", "team_id");
CREATE INDEX IF NOT EXISTS "civilization_spawn_points_game_id_team_id_idx"
  ON "civilization_spawn_points"("game_id", "team_id");
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'civilization_spawn_points_team_id_fkey'
  ) THEN
    ALTER TABLE "civilization_spawn_points"
      ADD CONSTRAINT "civilization_spawn_points_team_id_fkey"
      FOREIGN KEY ("team_id") REFERENCES "civilization_teams"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "civilization_game_players" AS "player"
SET "spawn_tile_id" = "spawn"."tile_id"
FROM "civilization_spawn_points" AS "spawn"
WHERE "spawn"."game_id" = "player"."game_id"
  AND "spawn"."team_id" = "player"."team_id";

UPDATE "civilization_game_players" AS "player"
SET
  "initial_tile_id" = "spawn"."tile_id",
  "current_tile_id" = "spawn"."tile_id"
FROM "civilization_spawn_points" AS "spawn",
     "civilization_games" AS "game"
WHERE "spawn"."game_id" = "player"."game_id"
  AND "spawn"."team_id" = "player"."team_id"
  AND "game"."id" = "player"."game_id"
  AND "game"."status" = 'DRAFT';

ALTER TABLE "civilization_towers"
  ADD COLUMN IF NOT EXISTS "hit_points" INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS "maximum_hit_points" INTEGER NOT NULL DEFAULT 100;

UPDATE "civilization_towers"
SET "hit_points" = 0
WHERE "status" IN ('DESTROYED', 'CANCELLED');

UPDATE "civilization_games"
SET "settings_json" = jsonb_set(
  jsonb_set(
    "settings_json"::jsonb,
    '{costs,towerBuildUnits}',
    COALESCE("settings_json"::jsonb #> '{costs,towerBuildUnits}', '2'::jsonb),
    true
  ),
  '{catapult}',
  COALESCE(
    "settings_json"::jsonb -> 'catapult',
    '{"enabled":true,"goldPrice":"150","actionPointUnits":4,"damage":50}'::jsonb
  ),
  true
);

CREATE TABLE IF NOT EXISTS "civilization_reward_claims" (
  "id" TEXT NOT NULL,
  "game_id" TEXT NOT NULL,
  "team_id" TEXT NOT NULL,
  "player_id" TEXT NOT NULL,
  "eligible" BOOLEAN NOT NULL,
  "unavailable_reason" TEXT,
  "reward_json" JSONB NOT NULL,
  "expires_at" TIMESTAMPTZ(3),
  "claimed_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "civilization_reward_claims_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "civilization_reward_claims_game_id_player_id_key"
  ON "civilization_reward_claims"("game_id", "player_id");
CREATE INDEX IF NOT EXISTS "civilization_reward_claims_player_id_claimed_at_idx"
  ON "civilization_reward_claims"("player_id", "claimed_at");
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'civilization_reward_claims_game_id_fkey') THEN
    ALTER TABLE "civilization_reward_claims"
      ADD CONSTRAINT "civilization_reward_claims_game_id_fkey"
      FOREIGN KEY ("game_id") REFERENCES "civilization_games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'civilization_reward_claims_team_id_fkey') THEN
    ALTER TABLE "civilization_reward_claims"
      ADD CONSTRAINT "civilization_reward_claims_team_id_fkey"
      FOREIGN KEY ("team_id") REFERENCES "civilization_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'civilization_reward_claims_player_id_fkey') THEN
    ALTER TABLE "civilization_reward_claims"
      ADD CONSTRAINT "civilization_reward_claims_player_id_fkey"
      FOREIGN KEY ("player_id") REFERENCES "civilization_game_players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
