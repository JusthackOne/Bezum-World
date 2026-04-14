import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TaskRepository, TaskSubmissionRepository } from './repositories';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TasksController],
  providers: [TasksService, TaskRepository, TaskSubmissionRepository],
})
export class TasksModule {}
