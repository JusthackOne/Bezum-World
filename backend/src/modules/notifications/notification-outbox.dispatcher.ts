import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  NOTIFICATION_OUTBOX_BATCH_SIZE,
  SEND_TELEGRAM_NOTIFICATION_JOB_NAME,
  TELEGRAM_NOTIFICATIONS_QUEUE_NAME,
} from './notifications.constants';
import { NotificationOutboxRepository } from './repositories';
import type { TelegramNotificationJobData } from './types';

@Injectable()
export class NotificationOutboxDispatcher {
  constructor(
    private readonly outboxRepository: NotificationOutboxRepository,
    @InjectQueue(TELEGRAM_NOTIFICATIONS_QUEUE_NAME)
    private readonly telegramQueue: Queue<TelegramNotificationJobData>,
  ) {}

  async dispatchBatch(): Promise<void> {
    const records = await this.outboxRepository.claimPending(NOTIFICATION_OUTBOX_BATCH_SIZE);

    for (const record of records) {
      try {
        await this.telegramQueue.add(
          SEND_TELEGRAM_NOTIFICATION_JOB_NAME,
          { outboxId: record.id },
          {
            jobId: `telegram-${record.id}`,
            attempts: 7,
            backoff: { type: 'exponential', delay: 2_000 },
            removeOnComplete: 1_000,
            removeOnFail: 5_000,
          },
        );
        await this.outboxRepository.markQueued(record.id);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown notification dispatch error';
        await this.outboxRepository.release(record.id, errorMessage.slice(0, 1_000));
      }
    }
  }
}
