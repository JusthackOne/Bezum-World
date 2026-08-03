-- Keep one deterministic spawn row for each existing game before enforcing
-- the new shared-spawn invariant.
WITH "ranked_spawns" AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "game_id" ORDER BY "created_at", "id") AS "position"
  FROM "civilization_spawn_points"
)
DELETE FROM "civilization_spawn_points" AS "spawn"
USING "ranked_spawns" AS "ranked"
WHERE "spawn"."id" = "ranked"."id"
  AND "ranked"."position" > 1;

-- Existing participants use the retained game spawn for future defeats.
UPDATE "civilization_game_players" AS "player"
SET "spawn_tile_id" = "spawn"."tile_id"
FROM "civilization_spawn_points" AS "spawn"
WHERE "spawn"."game_id" = "player"."game_id";

-- Draft games have not started, so their initial/current positions can safely
-- be normalized to the shared spawn as well.
UPDATE "civilization_game_players" AS "player"
SET
  "initial_tile_id" = "spawn"."tile_id",
  "current_tile_id" = "spawn"."tile_id"
FROM "civilization_spawn_points" AS "spawn"
JOIN "civilization_games" AS "game" ON "game"."id" = "spawn"."game_id"
WHERE "player"."game_id" = "game"."id"
  AND "game"."status" = 'DRAFT';

DROP INDEX "civilization_spawn_points_game_id_team_id_tile_id_key";
DROP INDEX "civilization_spawn_points_game_id_team_id_idx";
ALTER TABLE "civilization_spawn_points"
  DROP CONSTRAINT "civilization_spawn_points_team_id_fkey";
ALTER TABLE "civilization_spawn_points" DROP COLUMN "team_id";
CREATE UNIQUE INDEX "civilization_spawn_points_game_id_key"
  ON "civilization_spawn_points"("game_id");
