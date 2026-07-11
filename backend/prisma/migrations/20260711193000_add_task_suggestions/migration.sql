CREATE TYPE "TaskSuggestionStatus" AS ENUM ('pending', 'processed', 'winner');

CREATE TABLE "task_suggestions" (
    "id" TEXT NOT NULL,
    "creator_user_id" TEXT NOT NULL,
    "suggested_for_date" DATE NOT NULL,
    "status" "TaskSuggestionStatus" NOT NULL DEFAULT 'pending',
    "published_task_id" TEXT,
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
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "task_suggestions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_suggestion_votes" (
    "id" TEXT NOT NULL,
    "suggestion_id" TEXT NOT NULL,
    "voter_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_suggestion_votes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "task_suggestions_creator_user_id_suggested_for_date_key" ON "task_suggestions"("creator_user_id", "suggested_for_date");
CREATE INDEX "task_suggestions_suggested_for_date_status_idx" ON "task_suggestions"("suggested_for_date", "status");
CREATE INDEX "task_suggestions_creator_user_id_idx" ON "task_suggestions"("creator_user_id");
CREATE UNIQUE INDEX "task_suggestion_votes_suggestion_id_voter_user_id_key" ON "task_suggestion_votes"("suggestion_id", "voter_user_id");
CREATE INDEX "task_suggestion_votes_voter_user_id_idx" ON "task_suggestion_votes"("voter_user_id");

ALTER TABLE "task_suggestions" ADD CONSTRAINT "task_suggestions_creator_user_id_fkey" FOREIGN KEY ("creator_user_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_suggestion_votes" ADD CONSTRAINT "task_suggestion_votes_suggestion_id_fkey" FOREIGN KEY ("suggestion_id") REFERENCES "task_suggestions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "task_suggestion_votes" ADD CONSTRAINT "task_suggestion_votes_voter_user_id_fkey" FOREIGN KEY ("voter_user_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;
