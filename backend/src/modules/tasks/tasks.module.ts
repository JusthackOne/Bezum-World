import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { TaskRepository, TaskSuggestionRepository, TaskSubmissionRepository } from './repositories';
import { TASK_SUGGESTIONS_QUEUE_NAME } from './task-suggestions-queue.constants';
import { TaskSuggestionsProcessor } from './task-suggestions.processor';
import { TaskSuggestionsScheduler } from './task-suggestions.scheduler';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    BullModule.registerQueue({ name: TASK_SUGGESTIONS_QUEUE_NAME }),
    AuthModule,
    EventsModule,
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskSuggestionsProcessor,
    TaskSuggestionsScheduler,
    TaskRepository,
    TaskSuggestionRepository,
    TaskSubmissionRepository,
  ],
})
export class TasksModule {}
