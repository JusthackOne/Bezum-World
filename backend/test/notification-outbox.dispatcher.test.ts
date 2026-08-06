import { describe, expect, mock, test } from 'bun:test';
import {
  NotificationEventType,
  NotificationOutboxStatus,
  type NotificationOutbox,
} from '@prisma/client';
import type { Queue } from 'bullmq';

import { NotificationOutboxDispatcher } from '../src/modules/notifications/notification-outbox.dispatcher';
import { NotificationOutboxRepository } from '../src/modules/notifications/repositories';
import type { TelegramNotificationJobData } from '../src/modules/notifications/types';

function outboxRecord(id: string): NotificationOutbox {
  return {
    id,
    eventType: NotificationEventType.DAILY_DIGEST,
    schemaVersion: 1,
    payload: {},
    deduplicationKey: `daily-digest:${id}`,
    status: NotificationOutboxStatus.PROCESSING,
    availableAt: new Date(),
    lockedUntil: new Date(),
    dispatchAttempts: 1,
    deliveryAttempts: 0,
    telegramMessageIds: null,
    sentAt: null,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('NotificationOutboxDispatcher', () => {
  test('adds a deterministic BullMQ job and marks the record queued', async () => {
    const claimPending = mock(async () => [outboxRecord('outbox-1')]);
    const markQueued = mock(async () => undefined);
    const release = mock(async () => undefined);
    const add = mock(async () => undefined);
    const repository = {
      claimPending,
      markQueued,
      release,
    } as unknown as NotificationOutboxRepository;
    const queue = { add } as unknown as Queue<TelegramNotificationJobData>;
    const dispatcher = new NotificationOutboxDispatcher(repository, queue);

    await dispatcher.dispatchBatch();

    expect(add).toHaveBeenCalledTimes(1);
    expect(add.mock.calls[0]?.[2]).toMatchObject({
      jobId: 'telegram-outbox-1',
      attempts: 7,
    });
    expect(markQueued).toHaveBeenCalledWith('outbox-1');
    expect(release).not.toHaveBeenCalled();
  });

  test('releases the outbox record when BullMQ rejects the job', async () => {
    const claimPending = mock(async () => [outboxRecord('outbox-2')]);
    const markQueued = mock(async () => undefined);
    const release = mock(async () => undefined);
    const add = mock(async () => {
      throw new Error('Redis unavailable');
    });
    const repository = {
      claimPending,
      markQueued,
      release,
    } as unknown as NotificationOutboxRepository;
    const queue = { add } as unknown as Queue<TelegramNotificationJobData>;
    const dispatcher = new NotificationOutboxDispatcher(repository, queue);

    await dispatcher.dispatchBatch();

    expect(markQueued).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledWith('outbox-2', 'Redis unavailable');
  });
});
