-- Ensure Account game score column naming is normalized after tasks migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Account'
      AND column_name = 'game_score'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Account'
      AND column_name = 'gameScore'
  ) THEN
    ALTER TABLE "Account" RENAME COLUMN "game_score" TO "gameScore";
  END IF;
END $$;

-- Task.updatedAt is managed by Prisma (@updatedAt), keep DB column without a default.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE "tasks" ALTER COLUMN "updated_at" DROP DEFAULT;
  END IF;
END $$;