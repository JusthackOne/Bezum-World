import { describe, expect, mock, test } from 'bun:test';
import type { ConfigService } from '@nestjs/config';
import {
  NotificationEventType,
  NotificationOutboxStatus,
  type NotificationOutbox,
} from '@prisma/client';

import type { AppConfig } from '../src/config/configuration';
import { DailyDigestService } from '../src/modules/notifications/daily-digest.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import {
  NotificationOutboxRepository,
  NotificationStatisticsRepository,
} from '../src/modules/notifications/repositories';
import { TelegramClient } from '../src/modules/notifications/telegram';
import { TelegramMediaResolver } from '../src/modules/notifications/telegram/telegram-media.resolver';
import { TelegramNotificationSender } from '../src/modules/notifications/telegram-notification.sender';
import { NotificationTemplateRenderer } from '../src/modules/notifications/notification-template.renderer';

function outboxRecord(status = NotificationOutboxStatus.QUEUED): NotificationOutbox {
  return {
    id: 'outbox-1',
    eventType: NotificationEventType.TASK_SUGGESTED,
    schemaVersion: 1,
    payload: {
      suggestionId: 'suggestion-1',
      title: 'Test task',
      description: null,
      image: null,
      creatorUsername: 'hero',
      taskType: 'daily',
      createdAt: '2026-07-29T12:00:00.000Z',
    },
    deduplicationKey: 'task-suggested:suggestion-1',
    status,
    availableAt: new Date(),
    lockedUntil: null,
    dispatchAttempts: 1,
    deliveryAttempts: 0,
    telegramMessageIds: null,
    sentAt: null,
    lastError: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('DailyDigestService', () => {
  test('uses the completed Moscow day and a deterministic deduplication key', async () => {
    const getDailyStatistics = mock(async () => ({
      completedTasksCount: 12,
      leaderboard: [{ username: 'leader', gameScore: 500 }],
      purchases: [{ buyerUsername: 'buyer', itemName: 'Sword', rarity: 'sigma' as const }],
    }));
    const enqueue = mock(async () => undefined);
    const statisticsRepository = {
      getDailyStatistics,
    } as unknown as NotificationStatisticsRepository;
    const notificationsService = { enqueue } as unknown as NotificationsService;
    const service = new DailyDigestService(statisticsRepository, notificationsService);

    await service.enqueueForTrigger(new Date('2026-07-29T21:00:00.000Z'));

    expect(getDailyStatistics).toHaveBeenCalledWith(
      new Date('2026-07-28T21:00:00.000Z'),
      new Date('2026-07-29T21:00:00.000Z'),
    );
    expect(enqueue.mock.calls[0]?.[0]).toMatchObject({
      type: NotificationEventType.DAILY_DIGEST,
      payload: {
        date: '2026-07-29',
        completedTasksCount: 12,
        leaderboard: [{ place: 1, username: 'leader', gameScore: 500 }],
      },
    });
    expect(enqueue.mock.calls[0]?.[1]).toBe('daily-digest:2026-07-29');
  });
});

describe('TelegramNotificationSender', () => {
  test('stores returned Telegram message identifiers after rendering', async () => {
    const findById = mock(async () => outboxRecord());
    const incrementDeliveryAttempts = mock(async () => undefined);
    const markSent = mock(async () => undefined);
    const sendPost = mock(async () => [101]);
    const repository = {
      findById,
      incrementDeliveryAttempts,
      markSent,
    } as unknown as NotificationOutboxRepository;
    const telegramClient = { sendPost } as unknown as TelegramClient;
    const sender = new TelegramNotificationSender(
      repository,
      new NotificationTemplateRenderer(),
      telegramClient,
    );

    await sender.send('outbox-1');

    expect(incrementDeliveryAttempts).toHaveBeenCalledWith('outbox-1');
    expect(sendPost).toHaveBeenCalledTimes(1);
    expect(markSent).toHaveBeenCalledWith('outbox-1', [101]);
  });

  test('does not send an outbox record that is already marked sent', async () => {
    const findById = mock(async () => outboxRecord(NotificationOutboxStatus.SENT));
    const sendPost = mock(async () => [101]);
    const repository = { findById } as unknown as NotificationOutboxRepository;
    const telegramClient = { sendPost } as unknown as TelegramClient;
    const sender = new TelegramNotificationSender(
      repository,
      new NotificationTemplateRenderer(),
      telegramClient,
    );

    await sender.send('outbox-1');

    expect(sendPost).not.toHaveBeenCalled();
  });
});

describe('TelegramClient', () => {
  test('applies the configured proxy only to its Telegram fetch request', async () => {
    const originalFetch = globalThis.fetch;
    const fetchMock = mock(
      async () =>
        new Response(JSON.stringify({ ok: true, result: { message_id: 42 } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    try {
      const telegramConfig = {
        enabled: true,
        botToken: 'test-token',
        chatId: '123456',
        proxyUrl: 'http://proxy-user:proxy-password@proxy.test:8080',
        requestTimeoutMs: 5_000,
      };
      const configService = {
        get: () => telegramConfig,
      } as unknown as ConfigService<AppConfig, true>;
      const mediaResolver = {
        resolve: async () => null,
      } as unknown as TelegramMediaResolver;
      const client = new TelegramClient(configService, mediaResolver);

      const messageIds = await client.sendPost({ image: null, messages: ['Hello'] });

      const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
      const request = fetchMock.mock.calls[0]?.[1] as RequestInit & { proxy?: string };
      expect(requestUrl).toBe('https://api.telegram.org/bottest-token/sendMessage');
      expect(request.proxy).toBe(telegramConfig.proxyUrl);
      expect(JSON.parse(String(request.body))).toMatchObject({
        chat_id: telegramConfig.chatId,
        text: 'Hello',
      });
      expect(messageIds).toEqual([42]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
