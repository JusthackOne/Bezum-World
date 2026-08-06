import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { DailyDigestService } from './daily-digest.service';
import { NotificationOutboxDispatcher } from './notification-outbox.dispatcher';
import {
  CREATE_DAILY_DIGEST_JOB_NAME,
  DISPATCH_NOTIFICATION_OUTBOX_JOB_NAME,
  NOTIFICATION_OUTBOX_QUEUE_NAME,
} from './notifications.constants';

@Processor(NOTIFICATION_OUTBOX_QUEUE_NAME)
export class NotificationOutboxProcessor extends WorkerHost {
  constructor(
    private readonly dispatcher: NotificationOutboxDispatcher,
    private readonly dailyDigestService: DailyDigestService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === DISPATCH_NOTIFICATION_OUTBOX_JOB_NAME) {
      await this.dispatcher.dispatchBatch();
      return;
    }

    if (job.name === CREATE_DAILY_DIGEST_JOB_NAME) {
      await this.dailyDigestService.enqueueForTrigger(new Date(job.timestamp));
      return;
    }

    throw new Error(`Unsupported notification outbox job: ${job.name}`);
  }
}
