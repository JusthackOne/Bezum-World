-- AlterTable
ALTER TABLE "game_events"
  ADD COLUMN "task_completed_user_id" TEXT,
  ADD COLUMN "task_id" TEXT,
  ADD COLUMN "task_submission_id" TEXT,
  ADD COLUMN "proof_image" TEXT;

-- CreateIndex
CREATE INDEX "game_events_task_completed_user_id_idx" ON "game_events"("task_completed_user_id");

-- CreateIndex
CREATE INDEX "game_events_task_id_idx" ON "game_events"("task_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_events_task_submission_id_key" ON "game_events"("task_submission_id");

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_task_completed_user_id_fkey" FOREIGN KEY ("task_completed_user_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_events" ADD CONSTRAINT "game_events_task_submission_id_fkey" FOREIGN KEY ("task_submission_id") REFERENCES "task_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- UpdateCheckConstraint
ALTER TABLE "game_events" DROP CONSTRAINT "game_events_purchase_fields_check";

ALTER TABLE "game_events" ADD CONSTRAINT "game_events_fields_by_type_check" CHECK (
    (
        "type" = 'PURCHASE'
        AND "purchase_user_id" IS NOT NULL
        AND "item_id" IS NOT NULL
        AND "challenger_id" IS NULL
        AND "opponent_id" IS NULL
        AND "winner_id" IS NULL
        AND "task_completed_user_id" IS NULL
        AND "task_id" IS NULL
        AND "task_submission_id" IS NULL
        AND "proof_image" IS NULL
        AND "battle_result" IS NULL
        AND "game_score_reward" IS NULL
        AND "gold_reward" IS NULL
    )
    OR
    (
        "type" = 'BATTLE'
        AND "purchase_user_id" IS NULL
        AND "item_id" IS NULL
        AND "challenger_id" IS NOT NULL
        AND "opponent_id" IS NOT NULL
        AND "winner_id" IS NOT NULL
        AND "task_completed_user_id" IS NULL
        AND "task_id" IS NULL
        AND "task_submission_id" IS NULL
        AND "proof_image" IS NULL
        AND "battle_result" IS NOT NULL
        AND "game_score_reward" IS NOT NULL
        AND "gold_reward" IS NOT NULL
    )
    OR
    (
        "type" = 'TASK_COMPLETED'
        AND "purchase_user_id" IS NULL
        AND "item_id" IS NULL
        AND "challenger_id" IS NULL
        AND "opponent_id" IS NULL
        AND "winner_id" IS NULL
        AND "task_completed_user_id" IS NOT NULL
        AND "task_id" IS NOT NULL
        AND "task_submission_id" IS NOT NULL
        AND "battle_result" IS NULL
        AND "game_score_reward" IS NULL
        AND "gold_reward" IS NULL
    )
);
