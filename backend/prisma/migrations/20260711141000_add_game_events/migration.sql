-- CreateEnum
CREATE TYPE "GameEventType" AS ENUM ('PURCHASE', 'BATTLE');

-- CreateEnum
CREATE TYPE "BattleEventResult" AS ENUM ('WIN', 'LOSE');

-- CreateTable
CREATE TABLE "game_events" (
    "id" TEXT NOT NULL,
    "type" "GameEventType" NOT NULL,
    "purchase_user_id" TEXT,
    "item_id" TEXT,
    "challenger_id" TEXT,
    "opponent_id" TEXT,
    "winner_id" TEXT,
    "battle_result" "BattleEventResult",
    "game_score_reward" INTEGER,
    "gold_reward" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "game_events_type_created_at_idx" ON "game_events"("type", "created_at");

-- CreateIndex
CREATE INDEX "game_events_created_at_idx" ON "game_events"("created_at");

-- CreateIndex
CREATE INDEX "game_events_purchase_user_id_idx" ON "game_events"("purchase_user_id");

-- CreateIndex
CREATE INDEX "game_events_item_id_idx" ON "game_events"("item_id");

-- CreateIndex
CREATE INDEX "game_events_challenger_id_idx" ON "game_events"("challenger_id");

-- CreateIndex
CREATE INDEX "game_events_opponent_id_idx" ON "game_events"("opponent_id");

-- CreateIndex
CREATE INDEX "game_events_winner_id_idx" ON "game_events"("winner_id");

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_purchase_user_id_fkey" FOREIGN KEY ("purchase_user_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_challenger_id_fkey" FOREIGN KEY ("challenger_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_opponent_id_fkey" FOREIGN KEY ("opponent_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_purchase_fields_check" CHECK (
    ("type" = 'PURCHASE' AND "purchase_user_id" IS NOT NULL AND "item_id" IS NOT NULL AND "challenger_id" IS NULL AND "opponent_id" IS NULL AND "winner_id" IS NULL AND "battle_result" IS NULL AND "game_score_reward" IS NULL AND "gold_reward" IS NULL)
    OR
    ("type" = 'BATTLE' AND "purchase_user_id" IS NULL AND "item_id" IS NULL AND "challenger_id" IS NOT NULL AND "opponent_id" IS NOT NULL AND "winner_id" IS NOT NULL AND "battle_result" IS NOT NULL AND "game_score_reward" IS NOT NULL AND "gold_reward" IS NOT NULL)
);

-- AddCheckConstraint
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_rewards_non_negative_check" CHECK (
    ("game_score_reward" IS NULL OR "game_score_reward" >= 0)
    AND
    ("gold_reward" IS NULL OR "gold_reward" >= 0)
);
