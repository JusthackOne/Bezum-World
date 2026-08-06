import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import {
  SEND_TELEGRAM_NOTIFICATION_JOB_NAME,
  TELEGRAM_NOTIFICATIONS_QUEUE_NAME,
} from './notifications.constants';
import { TelegramApiError } from './telegram';
import { TelegramNotificationSender } from './telegram-notification.sender';
import type { TelegramNotificationJobData } from './types';

@Processor(TELEGRAM_NOTIFICATIONS_QUEUE_NAME, {
  concurrency: 10,
  limiter: { max: 25, duration: 1_000 },
})
export class TelegramNotificationProcessor extends WorkerHost {
  constructor(private readonly sender: TelegramNotificationSender) {
    super();
  }

  async process(job: Job<TelegramNotificationJobData>): Promise<void> {
    if (job.name !== SEND_TELEGRAM_NOTIFICATION_JOB_NAME) {
      throw new Error(`Unsupported Telegram notification job: ${job.name}`);
    }

    try {
      await this.sender.send(job.data.outboxId);
    } catch (error) {
      if (error instanceof TelegramApiError && !error.isRetryable) {
        await this.sender.markFailed(job.data.outboxId, error);
        return;
      }

      const maxAttempts = job.opts.attempts ?? 1;
      if (job.attemptsMade + 1 >= maxAttempts) {
        await this.sender.markFailed(job.data.outboxId, error);
      }

      throw error;
    }
  }
}
