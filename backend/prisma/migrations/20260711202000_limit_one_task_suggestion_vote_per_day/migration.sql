ALTER TABLE "task_suggestion_votes" ADD COLUMN "suggested_for_date" DATE;

UPDATE "task_suggestion_votes" AS "vote"
SET "suggested_for_date" = "suggestion"."suggested_for_date"
FROM "task_suggestions" AS "suggestion"
WHERE "vote"."suggestion_id" = "suggestion"."id";

ALTER TABLE "task_suggestion_votes" ALTER COLUMN "suggested_for_date" SET NOT NULL;

DELETE FROM "task_suggestion_votes" AS "duplicate_vote"
USING "task_suggestion_votes" AS "kept_vote"
WHERE "duplicate_vote"."voter_user_id" = "kept_vote"."voter_user_id"
  AND "duplicate_vote"."suggested_for_date" = "kept_vote"."suggested_for_date"
  AND (
    "duplicate_vote"."created_at" > "kept_vote"."created_at"
    OR (
      "duplicate_vote"."created_at" = "kept_vote"."created_at"
      AND "duplicate_vote"."id" > "kept_vote"."id"
    )
  );

CREATE UNIQUE INDEX "task_suggestion_votes_voter_user_id_suggested_for_date_key" ON "task_suggestion_votes"("voter_user_id", "suggested_for_date");
