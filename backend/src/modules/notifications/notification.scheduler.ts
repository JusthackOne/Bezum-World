import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';

import type { AppConfig } from '../../config/configuration';
import {
  CREATE_DAILY_DIGEST_JOB_NAME,
  DAILY_DIGEST_CRON_PATTERN,
  DAILY_DIGEST_SCHEDULER_ID,
  DAILY_DIGEST_TIME_ZONE,
  DISPATCH_NOTIFICATION_OUTBOX_JOB_NAME,
  NOTIFICATION_OUTBOX_INTERVAL_MS,
  NOTIFICATION_OUTBOX_QUEUE_NAME,
  NOTIFICATION_OUTBOX_SCHEDULER_ID,
} from './notifications.constants';

@Injectable()
export class NotificationScheduler implements OnModuleInit {
  private readonly enabled: boolean;

  constructor(
    configService: ConfigService<AppConfig, true>,
    @InjectQueue(NOTIFICATION_OUTBOX_QUEUE_NAME)
    private readonly outboxQueue: Queue,
  ) {
    this.enabled = configService.get('telegram.enabled', { infer: true });
  }

  async onModuleInit(): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await Promise.all([
      this.outboxQueue.upsertJobScheduler(
        NOTIFICATION_OUTBOX_SCHEDULER_ID,
        { every: NOTIFICATION_OUTBOX_INTERVAL_MS },
        {
          name: DISPATCH_NOTIFICATION_OUTBOX_JOB_NAME,
          data: {},
          opts: {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2_000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        },
      ),
      this.outboxQueue.upsertJobScheduler(
        DAILY_DIGEST_SCHEDULER_ID,
        { pattern: DAILY_DIGEST_CRON_PATTERN, tz: DAILY_DIGEST_TIME_ZONE },
        {
          name: CREATE_DAILY_DIGEST_JOB_NAME,
          data: {},
          opts: {
            attempts: 5,
            backoff: { type: 'exponential', delay: 5_000 },
            removeOnComplete: 100,
            removeOnFail: 500,
          },
        },
      ),
    ]);
  }
}
