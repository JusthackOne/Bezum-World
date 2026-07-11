import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../events/events.module';
import { TaskRepository, TaskSuggestionRepository, TaskSubmissionRepository } from './repositories';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PrismaModule, AuthModule, EventsModule],
  controllers: [TasksController],
  providers: [TasksService, TaskRepository, TaskSuggestionRepository, TaskSubmissionRepository],
})
export class TasksModule {}
