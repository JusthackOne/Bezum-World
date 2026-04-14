-- AlterTable
ALTER TABLE "Account"
ADD COLUMN "game_score" INTEGER NOT NULL DEFAULT 0;

-- AddCheckConstraint
ALTER TABLE "Account"
ADD CONSTRAINT "Account_game_score_non_negative_check" CHECK ("game_score" >= 0);

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('daily', 'weekly', 'event');

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "reward_money" INTEGER NOT NULL,
    "reward_game_score" INTEGER,
    "reward_attributes" JSONB,
    "requires_proof_image" BOOLEAN NOT NULL DEFAULT false,
    "submission_limit" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_submissions" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "proof_image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_type_idx" ON "tasks"("type");
CREATE INDEX "tasks_created_at_idx" ON "tasks"("created_at");
CREATE INDEX "task_submissions_task_id_idx" ON "task_submissions"("task_id");
CREATE INDEX "task_submissions_user_id_idx" ON "task_submissions"("user_id");
CREATE INDEX "task_submissions_task_id_user_id_created_at_idx" ON "task_submissions"("task_id", "user_id", "created_at");

-- AddForeignKey
ALTER TABLE "task_submissions"
ADD CONSTRAINT "task_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_submissions"
ADD CONSTRAINT "task_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "tasks"
ADD CONSTRAINT "tasks_reward_money_non_negative_check" CHECK ("reward_money" >= 0),
ADD CONSTRAINT "tasks_reward_game_score_non_negative_check" CHECK ("reward_game_score" IS NULL OR "reward_game_score" >= 0),
ADD CONSTRAINT "tasks_submission_limit_positive_check" CHECK ("submission_limit" IS NULL OR "submission_limit" >= 1);