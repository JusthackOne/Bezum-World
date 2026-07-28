export const NOTIFICATION_OUTBOX_QUEUE_NAME = 'notification-outbox';
export const TELEGRAM_NOTIFICATIONS_QUEUE_NAME = 'telegram-notifications';

export const DISPATCH_NOTIFICATION_OUTBOX_JOB_NAME = 'dispatch-notification-outbox';
export const SEND_TELEGRAM_NOTIFICATION_JOB_NAME = 'send-telegram-notification';
export const CREATE_DAILY_DIGEST_JOB_NAME = 'create-daily-telegram-digest';

export const NOTIFICATION_OUTBOX_SCHEDULER_ID = 'notification-outbox-every-second';
export const DAILY_DIGEST_SCHEDULER_ID = 'telegram-daily-digest-midnight-moscow';

export const NOTIFICATION_OUTBOX_INTERVAL_MS = 1_000;
export const DAILY_DIGEST_CRON_PATTERN = '0 0 * * *';
export const DAILY_DIGEST_TIME_ZONE = 'Europe/Moscow';

export const NOTIFICATION_OUTBOX_BATCH_SIZE = 100;
export const NOTIFICATION_PROCESSING_LEASE_SECONDS = 60;
