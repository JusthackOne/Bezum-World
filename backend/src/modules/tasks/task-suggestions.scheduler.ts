import { Injectable, type OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import {
  PROCESS_PENDING_TASK_SUGGESTIONS_JOB_NAME,
  PROCESS_PENDING_TASK_SUGGESTIONS_SCHEDULER_ID,
  TASK_SUGGESTION_PROCESS_INTERVAL_MS,
  TASK_SUGGESTIONS_QUEUE_NAME,
} from './task-suggestions-queue.constants';

@Injectable()
export class TaskSuggestionsScheduler implements OnModuleInit {
  constructor(
    @InjectQueue(TASK_SUGGESTIONS_QUEUE_NAME)
    private readonly taskSuggestionsQueue: Queue,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.taskSuggestionsQueue.upsertJobScheduler(
      PROCESS_PENDING_TASK_SUGGESTIONS_SCHEDULER_ID,
      { every: TASK_SUGGESTION_PROCESS_INTERVAL_MS },
      {
        name: PROCESS_PENDING_TASK_SUGGESTIONS_JOB_NAME,
        data: {},
        opts: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5_000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      },
    );
  }
}
