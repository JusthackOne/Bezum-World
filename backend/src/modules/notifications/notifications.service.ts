import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '@prisma/client';

import type { AppConfig } from '../../config/configuration';
import { NotificationOutboxRepository } from './repositories';
import type { NotificationEvent } from './types';

@Injectable()
export class NotificationsService {
  private readonly enabled: boolean;

  constructor(
    configService: ConfigService<AppConfig, true>,
    private readonly outboxRepository: NotificationOutboxRepository,
  ) {
    this.enabled = configService.get('telegram.enabled', { infer: true });
  }

  async enqueue(
    event: NotificationEvent,
    deduplicationKey: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (!this.enabled) {
      return;
    }

    await this.outboxRepository.create(
      {
        eventType: event.type,
        payload: this.toJson(event.payload),
        deduplicationKey,
        availableAt: new Date(),
      },
      tx,
    );
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
