-- AlterTable
ALTER TABLE "task_submissions"
ADD COLUMN "granted_game_score" INTEGER NOT NULL DEFAULT 0;

-- Backfill historical submissions from current task rewards
UPDATE "task_submissions" AS "submission"
SET "granted_game_score" = COALESCE("task"."reward_game_score", 0)
FROM "tasks" AS "task"
WHERE "submission"."task_id" = "task"."id";

-- AddCheckConstraint
ALTER TABLE "task_submissions"
ADD CONSTRAINT "task_submissions_granted_game_score_non_negative_check" CHECK ("granted_game_score" >= 0);
