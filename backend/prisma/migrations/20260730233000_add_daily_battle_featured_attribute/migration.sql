CREATE TYPE "BattleAttribute" AS ENUM ('strength', 'charisma', 'endurance', 'intelligence');

CREATE TABLE "daily_battles" (
    "id" TEXT NOT NULL,
    "player_one_id" TEXT NOT NULL,
    "player_two_id" TEXT NOT NULL,
    "day_starts_at" TIMESTAMPTZ(3) NOT NULL,
    "featured_attribute" "BattleAttribute" NOT NULL,
    "completed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_battles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "daily_battles_ordered_players_check" CHECK ("player_one_id" < "player_two_id")
);

CREATE UNIQUE INDEX "daily_battles_player_one_id_player_two_id_day_starts_at_key"
    ON "daily_battles"("player_one_id", "player_two_id", "day_starts_at");
CREATE INDEX "daily_battles_player_one_id_day_starts_at_idx"
    ON "daily_battles"("player_one_id", "day_starts_at");
CREATE INDEX "daily_battles_player_two_id_day_starts_at_idx"
    ON "daily_battles"("player_two_id", "day_starts_at");

ALTER TABLE "daily_battles"
    ADD CONSTRAINT "daily_battles_player_one_id_fkey"
    FOREIGN KEY ("player_one_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "daily_battles"
    ADD CONSTRAINT "daily_battles_player_two_id_fkey"
    FOREIGN KEY ("player_two_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the current day's completed state when this migration is deployed.
INSERT INTO "daily_battles" (
    "id",
    "player_one_id",
    "player_two_id",
    "day_starts_at",
    "featured_attribute",
    "completed_at",
    "created_at"
)
SELECT
    (array_agg("id" ORDER BY "created_at"))[1],
    LEAST("attacker_user_id", "defender_user_id"),
    GREATEST("attacker_user_id", "defender_user_id"),
    date_trunc('day', "created_at" AT TIME ZONE 'Europe/Moscow') AT TIME ZONE 'Europe/Moscow',
    (ARRAY['strength', 'charisma', 'endurance', 'intelligence']::"BattleAttribute"[])[floor(random() * 4 + 1)::integer],
    MIN("created_at"),
    MIN("created_at")
FROM "battle_logs"
GROUP BY
    LEAST("attacker_user_id", "defender_user_id"),
    GREATEST("attacker_user_id", "defender_user_id"),
    date_trunc('day', "created_at" AT TIME ZONE 'Europe/Moscow') AT TIME ZONE 'Europe/Moscow';

ALTER TABLE "battle_logs" ADD COLUMN "daily_battle_id" TEXT;
CREATE UNIQUE INDEX "battle_logs_daily_battle_id_key" ON "battle_logs"("daily_battle_id");
ALTER TABLE "battle_logs"
    ADD CONSTRAINT "battle_logs_daily_battle_id_fkey"
    FOREIGN KEY ("daily_battle_id") REFERENCES "daily_battles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
