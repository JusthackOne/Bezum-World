import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import {
  PROCESS_PENDING_TASK_SUGGESTIONS_JOB_NAME,
  TASK_SUGGESTIONS_QUEUE_NAME,
} from './task-suggestions-queue.constants';
import { TasksService } from './tasks.service';

@Processor(TASK_SUGGESTIONS_QUEUE_NAME)
export class TaskSuggestionsProcessor extends WorkerHost {
  constructor(private readonly tasksService: TasksService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== PROCESS_PENDING_TASK_SUGGESTIONS_JOB_NAME) {
      throw new Error(`Unsupported task suggestions job: ${job.name}`);
    }

    await this.tasksService.processPendingSuggestionDays();
  }
}
