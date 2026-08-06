-- Initial and future respawn metadata now always references the shared spawn.
UPDATE "civilization_game_players" AS "player"
SET
  "initial_tile_id" = "spawn"."tile_id",
  "spawn_tile_id" = "spawn"."tile_id"
FROM "civilization_spawn_points" AS "spawn"
WHERE "spawn"."game_id" = "player"."game_id";

-- Legacy rules allowed players to finish movement on structure tiles. Move
-- active occupants to the stackable shared spawn without disturbing valid
-- active positions.
UPDATE "civilization_game_players" AS "player"
SET "current_tile_id" = "spawn"."tile_id"
FROM "civilization_spawn_points" AS "spawn"
WHERE "spawn"."game_id" = "player"."game_id"
  AND "player"."is_active" = true
  AND "player"."current_tile_id" <> "spawn"."tile_id"
  AND (
    EXISTS (
      SELECT 1
      FROM "civilization_buildings" AS "building"
      WHERE "building"."game_id" = "player"."game_id"
        AND "building"."tile_id" = "player"."current_tile_id"
    )
    OR EXISTS (
      SELECT 1
      FROM "civilization_towers" AS "tower"
      WHERE "tower"."game_id" = "player"."game_id"
        AND "tower"."tile_id" = "player"."current_tile_id"
        AND "tower"."status" <> 'CANCELLED'
    )
  );

-- Keep the earliest active occupant on each regular hex and move every
-- additional legacy occupant to the shared spawn. The spawn itself remains
-- intentionally unbounded.
WITH "ranked_occupants" AS (
  SELECT
    "player"."id",
    "player"."game_id",
    ROW_NUMBER() OVER (
      PARTITION BY "player"."game_id", "player"."current_tile_id"
      ORDER BY "player"."joined_at", "player"."id"
    ) AS "position"
  FROM "civilization_game_players" AS "player"
  JOIN "civilization_spawn_points" AS "spawn"
    ON "spawn"."game_id" = "player"."game_id"
  WHERE "player"."is_active" = true
    AND "player"."current_tile_id" <> "spawn"."tile_id"
)
UPDATE "civilization_game_players" AS "player"
SET "current_tile_id" = "spawn"."tile_id"
FROM "ranked_occupants" AS "ranked"
JOIN "civilization_spawn_points" AS "spawn"
  ON "spawn"."game_id" = "ranked"."game_id"
WHERE "player"."id" = "ranked"."id"
  AND "ranked"."position" > 1;
