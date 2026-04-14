-- CreateTable
CREATE TABLE "battle_logs" (
    "id" TEXT NOT NULL,
    "attacker_user_id" TEXT NOT NULL,
    "defender_user_id" TEXT NOT NULL,
    "attacker_power" DOUBLE PRECISION NOT NULL,
    "defender_power" DOUBLE PRECISION NOT NULL,
    "attacker_win_probability" DOUBLE PRECISION NOT NULL,
    "winner_user_id" TEXT NOT NULL,
    "loser_user_id" TEXT NOT NULL,
    "transferred_coins" INTEGER NOT NULL,
    "game_score_reward" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battle_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "battle_logs_attacker_user_id_defender_user_id_created_at_idx" ON "battle_logs"("attacker_user_id", "defender_user_id", "created_at");

-- CreateIndex
CREATE INDEX "battle_logs_winner_user_id_idx" ON "battle_logs"("winner_user_id");

-- CreateIndex
CREATE INDEX "battle_logs_loser_user_id_idx" ON "battle_logs"("loser_user_id");

-- AddForeignKey
ALTER TABLE "battle_logs" ADD CONSTRAINT "battle_logs_attacker_user_id_fkey" FOREIGN KEY ("attacker_user_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_logs" ADD CONSTRAINT "battle_logs_defender_user_id_fkey" FOREIGN KEY ("defender_user_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_logs" ADD CONSTRAINT "battle_logs_winner_user_id_fkey" FOREIGN KEY ("winner_user_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battle_logs" ADD CONSTRAINT "battle_logs_loser_user_id_fkey" FOREIGN KEY ("loser_user_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "battle_logs" ADD CONSTRAINT "battle_logs_transferred_coins_non_negative_check" CHECK ("transferred_coins" >= 0);

-- AddCheckConstraint
ALTER TABLE "battle_logs" ADD CONSTRAINT "battle_logs_game_score_reward_non_negative_check" CHECK ("game_score_reward" >= 0);
