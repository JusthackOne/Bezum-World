import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { QueueModule } from '../../infrastructure/queue/queue.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminCivilizationController } from './admin-civilization.controller';
import { CivilizationActionsService } from './civilization-actions.service';
import { CivilizationAdminService } from './civilization-admin.service';
import { CivilizationCompletionService } from './civilization-completion.service';
import { CivilizationConfigurationService } from './civilization-configuration.service';
import { CIVILIZATION_QUEUE } from './civilization.constants';
import { CivilizationConnectivityService } from './civilization-connectivity.service';
import { CivilizationController } from './civilization.controller';
import { CivilizationLifecycleService } from './civilization-lifecycle.service';
import { CivilizationProcessor } from './civilization.processor';
import { CivilizationQueryService } from './civilization-query.service';
import { CivilizationRateLimitGuard } from './civilization-rate-limit.guard';
import { CivilizationRuntimeService } from './civilization-runtime.service';
import { CivilizationScheduleService } from './civilization-schedule.service';
import { CivilizationSettlementService } from './civilization-settlement.service';
import { CivilizationRepository } from './repositories';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    QueueModule,
    BullModule.registerQueue({ name: CIVILIZATION_QUEUE }),
  ],
  controllers: [CivilizationController, AdminCivilizationController],
  providers: [
    CivilizationRepository,
    CivilizationRuntimeService,
    CivilizationConfigurationService,
    CivilizationSettlementService,
    CivilizationConnectivityService,
    CivilizationQueryService,
    CivilizationCompletionService,
    CivilizationScheduleService,
    CivilizationActionsService,
    CivilizationAdminService,
    CivilizationLifecycleService,
    CivilizationProcessor,
    CivilizationRateLimitGuard,
  ],
  exports: [CivilizationQueryService],
})
export class CivilizationModule {}
