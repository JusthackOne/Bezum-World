-- Existing TIMESTAMP values were written by Prisma as UTC. Interpret them as UTC
-- while converting every instant column to PostgreSQL's timezone-aware type.
SET TIME ZONE 'UTC';

ALTER TABLE "Account"
  ALTER COLUMN "lastTimeLoggedIn" TYPE TIMESTAMPTZ(3) USING "lastTimeLoggedIn" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE "slot_statistics"
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "boss_battles"
  ALTER COLUMN "starts_at" TYPE TIMESTAMPTZ(3) USING "starts_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "ends_at" TYPE TIMESTAMPTZ(3) USING "ends_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "defeated_at" TYPE TIMESTAMPTZ(3) USING "defeated_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "finished_at" TYPE TIMESTAMPTZ(3) USING "finished_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "results_finalized_at" TYPE TIMESTAMPTZ(3) USING "results_finalized_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "boss_battle_rewards"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "boss_reward_item_templates"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "boss_attacks"
  ALTER COLUMN "attacked_at" TYPE TIMESTAMPTZ(3) USING "attacked_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "cooldown_slot" TYPE TIMESTAMPTZ(3) USING "cooldown_slot" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "boss_battle_participants"
  ALTER COLUMN "first_attack_at" TYPE TIMESTAMPTZ(3) USING "first_attack_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "last_attack_at" TYPE TIMESTAMPTZ(3) USING "last_attack_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "last_cooldown_slot" TYPE TIMESTAMPTZ(3) USING "last_cooldown_slot" AT TIME ZONE 'UTC',
  ALTER COLUMN "next_attack_at" TYPE TIMESTAMPTZ(3) USING "next_attack_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "boss_battle_results"
  ALTER COLUMN "first_attack_at" TYPE TIMESTAMPTZ(3) USING "first_attack_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "last_attack_at" TYPE TIMESTAMPTZ(3) USING "last_attack_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "boss_reward_claims"
  ALTER COLUMN "claimed_at" TYPE TIMESTAMPTZ(3) USING "claimed_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "boss_battle_audit_logs"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "AuthCode"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC';

ALTER TABLE "Admin"
  ALTER COLUMN "lastTimeLoggedIn" TYPE TIMESTAMPTZ(3) USING "lastTimeLoggedIn" AT TIME ZONE 'UTC',
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(3) USING "createdAt" AT TIME ZONE 'UTC',
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(3) USING "updatedAt" AT TIME ZONE 'UTC';

ALTER TABLE "items"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "tasks"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "updated_at" TYPE TIMESTAMPTZ(3) USING "updated_at" AT TIME ZONE 'UTC';

ALTER TABLE "task_suggestions"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC',
  ALTER COLUMN "processed_at" TYPE TIMESTAMPTZ(3) USING "processed_at" AT TIME ZONE 'UTC';

ALTER TABLE "task_suggestion_votes"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "task_submissions"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "battle_logs"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';

ALTER TABLE "game_events"
  ALTER COLUMN "created_at" TYPE TIMESTAMPTZ(3) USING "created_at" AT TIME ZONE 'UTC';
