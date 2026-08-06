import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma/prisma.module';
import { QueueModule } from '../../infrastructure/queue/queue.module';
import { DailyDigestService } from './daily-digest.service';
import { NotificationOutboxDispatcher } from './notification-outbox.dispatcher';
import { NotificationOutboxProcessor } from './notification-outbox.processor';
import { NotificationTemplateRenderer } from './notification-template.renderer';
import { NotificationScheduler } from './notification.scheduler';
import {
  NOTIFICATION_OUTBOX_QUEUE_NAME,
  TELEGRAM_NOTIFICATIONS_QUEUE_NAME,
} from './notifications.constants';
import { NotificationsService } from './notifications.service';
import { NotificationOutboxRepository, NotificationStatisticsRepository } from './repositories';
import { TelegramClient, TelegramMediaResolver } from './telegram';
import { TelegramNotificationProcessor } from './telegram-notification.processor';
import { TelegramNotificationSender } from './telegram-notification.sender';

@Module({
  imports: [
    PrismaModule,
    QueueModule,
    BullModule.registerQueue(
      { name: NOTIFICATION_OUTBOX_QUEUE_NAME },
      { name: TELEGRAM_NOTIFICATIONS_QUEUE_NAME },
    ),
  ],
  providers: [
    NotificationsService,
    NotificationScheduler,
    NotificationOutboxProcessor,
    NotificationOutboxDispatcher,
    TelegramNotificationProcessor,
    TelegramNotificationSender,
    TelegramClient,
    TelegramMediaResolver,
    NotificationTemplateRenderer,
    NotificationOutboxRepository,
    NotificationStatisticsRepository,
    DailyDigestService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
