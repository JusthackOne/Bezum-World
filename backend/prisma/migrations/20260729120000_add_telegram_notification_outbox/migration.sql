CREATE TYPE "NotificationEventType" AS ENUM (
  'TASK_SUGGESTED',
  'BOSS_ACTIVATED',
  'BOSS_DEFEATED',
  'DAILY_DIGEST'
);

CREATE TYPE "NotificationOutboxStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'QUEUED',
  'SENT',
  'FAILED'
);

CREATE TABLE "notification_outbox" (
  "id" TEXT NOT NULL,
  "event_type" "NotificationEventType" NOT NULL,
  "schema_version" INTEGER NOT NULL DEFAULT 1,
  "payload" JSONB NOT NULL,
  "deduplication_key" TEXT NOT NULL,
  "status" "NotificationOutboxStatus" NOT NULL DEFAULT 'PENDING',
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locked_until" TIMESTAMP(3),
  "dispatch_attempts" INTEGER NOT NULL DEFAULT 0,
  "delivery_attempts" INTEGER NOT NULL DEFAULT 0,
  "telegram_message_ids" JSONB,
  "sent_at" TIMESTAMP(3),
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_outbox_deduplication_key_key"
ON "notification_outbox"("deduplication_key");

CREATE INDEX "notification_outbox_status_available_at_idx"
ON "notification_outbox"("status", "available_at");
