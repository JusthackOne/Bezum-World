import { Injectable } from '@nestjs/common';
import { NotificationOutboxStatus } from '@prisma/client';

import { NotificationTemplateRenderer } from './notification-template.renderer';
import { NotificationOutboxRepository } from './repositories';
import { TelegramClient } from './telegram';

@Injectable()
export class TelegramNotificationSender {
  constructor(
    private readonly outboxRepository: NotificationOutboxRepository,
    private readonly templateRenderer: NotificationTemplateRenderer,
    private readonly telegramClient: TelegramClient,
  ) {}

  async send(outboxId: string): Promise<void> {
    const outbox = await this.outboxRepository.findById(outboxId);

    if (!outbox) {
      throw new Error(`Notification outbox ${outboxId} was not found`);
    }

    if (outbox.status === NotificationOutboxStatus.SENT) {
      return;
    }

    await this.outboxRepository.incrementDeliveryAttempts(outbox.id);
    const post = this.templateRenderer.render(outbox);
    const telegramMessageIds = await this.telegramClient.sendPost(post);
    await this.outboxRepository.markSent(outbox.id, telegramMessageIds);
  }

  markFailed(outboxId: string, error: unknown): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown Telegram delivery error';
    return this.outboxRepository.markFailed(outboxId, errorMessage.slice(0, 1_000));
  }
}
