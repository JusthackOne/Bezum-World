import { Injectable } from '@nestjs/common';
import {
  NotificationOutboxStatus,
  type NotificationEventType,
  type NotificationOutbox,
  type Prisma,
} from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { NOTIFICATION_PROCESSING_LEASE_SECONDS } from '../notifications.constants';

export interface CreateNotificationOutboxInput {
  eventType: NotificationEventType;
  payload: Prisma.InputJsonValue;
  deduplicationKey: string;
  availableAt: Date;
}

export interface ClaimedNotificationOutbox {
  id: string;
}

@Injectable()
export class NotificationOutboxRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationOutboxInput, tx?: Prisma.TransactionClient): Promise<void> {
    await this.getClient(tx).notificationOutbox.upsert({
      where: { deduplicationKey: input.deduplicationKey },
      create: {
        eventType: input.eventType,
        payload: input.payload,
        deduplicationKey: input.deduplicationKey,
        availableAt: input.availableAt,
      },
      update: {},
    });
  }

  claimPending(limit: number): Promise<ClaimedNotificationOutbox[]> {
    const leaseSeconds = NOTIFICATION_PROCESSING_LEASE_SECONDS;

    return this.prisma.$queryRaw<ClaimedNotificationOutbox[]>`
      WITH candidates AS (
        SELECT "id"
        FROM "notification_outbox"
        WHERE "available_at" <= NOW()
          AND (
            "status" = 'PENDING'
            OR (
              "status" = 'PROCESSING'
              AND "locked_until" < NOW()
            )
          )
        ORDER BY "created_at"
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "notification_outbox" AS outbox
      SET
        "status" = 'PROCESSING',
        "locked_until" = NOW() + (${leaseSeconds} * INTERVAL '1 second'),
        "dispatch_attempts" = "dispatch_attempts" + 1,
        "updated_at" = NOW()
      FROM candidates
      WHERE outbox."id" = candidates."id"
      RETURNING outbox."id"
    `;
  }

  async markQueued(id: string): Promise<void> {
    await this.prisma.notificationOutbox.updateMany({
      where: {
        id,
        status: NotificationOutboxStatus.PROCESSING,
      },
      data: {
        status: NotificationOutboxStatus.QUEUED,
        lockedUntil: null,
        lastError: null,
      },
    });
  }

  async release(id: string, errorMessage: string): Promise<void> {
    await this.prisma.notificationOutbox.updateMany({
      where: {
        id,
        status: NotificationOutboxStatus.PROCESSING,
      },
      data: {
        status: NotificationOutboxStatus.PENDING,
        lockedUntil: null,
        lastError: errorMessage,
        availableAt: new Date(Date.now() + 5_000),
      },
    });
  }

  findById(id: string): Promise<NotificationOutbox | null> {
    return this.prisma.notificationOutbox.findUnique({ where: { id } });
  }

  async incrementDeliveryAttempts(id: string): Promise<void> {
    await this.prisma.notificationOutbox.update({
      where: { id },
      data: { deliveryAttempts: { increment: 1 } },
    });
  }

  async markSent(id: string, telegramMessageIds: number[]): Promise<void> {
    await this.prisma.notificationOutbox.update({
      where: { id },
      data: {
        status: NotificationOutboxStatus.SENT,
        telegramMessageIds,
        sentAt: new Date(),
        lockedUntil: null,
        lastError: null,
      },
    });
  }

  async markFailed(id: string, errorMessage: string): Promise<void> {
    await this.prisma.notificationOutbox.updateMany({
      where: {
        id,
        status: { not: NotificationOutboxStatus.SENT },
      },
      data: {
        status: NotificationOutboxStatus.FAILED,
        lockedUntil: null,
        lastError: errorMessage,
      },
    });
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
