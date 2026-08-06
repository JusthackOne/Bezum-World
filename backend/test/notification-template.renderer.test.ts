import { describe, expect, test } from 'bun:test';
import { NotificationEventType, type Prisma } from '@prisma/client';

import { NotificationTemplateRenderer } from '../src/modules/notifications/notification-template.renderer';

const renderer = new NotificationTemplateRenderer();

function json(value: unknown): Prisma.JsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.JsonValue;
}

describe('NotificationTemplateRenderer', () => {
  test('renders and escapes a task suggestion media caption', () => {
    const post = renderer.render({
      eventType: NotificationEventType.TASK_SUGGESTED,
      payload: json({
        suggestionId: 'suggestion-1',
        title: 'Read <TypeScript> & practice',
        description: 'Complete one chapter.',
        image: '/uploads/tasks/task.jpg',
        creatorUsername: 'fox<admin>',
        taskType: 'daily',
        createdAt: '2026-07-29T12:00:00.000Z',
      }),
    });

    expect(post.image).toBe('/uploads/tasks/task.jpg');
    expect(post.messages).toHaveLength(1);
    expect(post.messages[0]).toContain('Read &lt;TypeScript&gt; &amp; practice');
    expect(post.messages[0]).toContain('fox&lt;admin&gt;');
    expect(post.messages[0]).toContain('Ежедневное');
    expect(post.messages[0]!.length).toBeLessThanOrEqual(1_024);
  });

  test('renders the boss activation deadline in Moscow time', () => {
    const post = renderer.render({
      eventType: NotificationEventType.BOSS_ACTIVATED,
      payload: json({
        battleId: 'boss-1',
        name: 'Void Dragon',
        description: 'A new threat appeared.',
        imageUrl: '/uploads/boss-battles/dragon.jpg',
        startsAt: '2026-07-29T17:00:00.000Z',
        endsAt: '2026-07-29T21:00:00.000Z',
      }),
    });

    expect(post.messages[0]).toContain('30.07.2026, 00:00');
    expect(post.messages[0]).toContain('НОВЫЙ БОСС В БОЮ');
  });

  test('renders only the first three boss leaderboard entries', () => {
    const post = renderer.render({
      eventType: NotificationEventType.BOSS_DEFEATED,
      payload: json({
        battleId: 'boss-1',
        name: 'Void Dragon',
        imageUrl: null,
        defeatedAt: '2026-07-29T20:00:00.000Z',
        topPlayers: [
          { place: 1, username: 'first', totalDamage: 300 },
          { place: 2, username: 'second', totalDamage: 200 },
          { place: 3, username: 'third', totalDamage: 100 },
          { place: 4, username: 'fourth', totalDamage: 50 },
        ],
      }),
    });

    expect(post.messages[0]).toContain('🥇 <b>first</b>');
    expect(post.messages[0]).toContain('🥉 <b>third</b>');
    expect(post.messages[0]).not.toContain('fourth');
  });

  test('splits a large daily digest into valid complete messages', () => {
    const purchases = Array.from({ length: 100 }, (_, index) => ({
      buyerUsername: `player-${index}`,
      itemName: `Item ${index}`,
      rarity: 'sigma',
    }));
    const post = renderer.render({
      eventType: NotificationEventType.DAILY_DIGEST,
      payload: json({
        date: '2026-07-29',
        completedTasksCount: 42,
        leaderboard: [
          { place: 1, username: 'first', gameScore: 300 },
          { place: 2, username: 'second', gameScore: 200 },
          { place: 3, username: 'third', gameScore: 100 },
        ],
        purchases,
      }),
    });

    expect(post.messages.length).toBeGreaterThan(1);
    expect(post.messages.every((message) => message.length <= 4_096)).toBe(true);
    expect(post.messages.join('\n')).toContain('player-99');
    expect(post.messages[0]).toContain('Выполнено заданий: <b>42</b>');
  });

  test('renders Civilization completion standings and escapes team names', () => {
    const post = renderer.render({
      eventType: NotificationEventType.CIVILIZATION_GAME_COMPLETED,
      payload: json({
        gameId: 'game-1',
        gameName: 'Summer <final>',
        completedAt: '2026-08-06T18:00:00.000Z',
        reason: 'TOWN_HALL_CAPTURED',
        winnerTeamId: 'team-a',
        teams: [
          {
            id: 'team-a',
            name: 'Red & Gold',
            score: '12345.5',
            playerCount: 4,
            gold: '9000.25',
            attributes: {
              strength: '10',
              charisma: '20',
              endurance: '30',
              intelligence: '40',
            },
          },
          {
            id: 'team-b',
            name: 'Blue',
            score: '10000',
            playerCount: 3,
            gold: '7000',
            attributes: {
              strength: '9',
              charisma: '8',
              endurance: '7',
              intelligence: '6',
            },
          },
        ],
      }),
    });

    expect(post.image).toBeNull();
    expect(post.messages).toHaveLength(1);
    expect(post.messages[0]).toContain('Summer &lt;final&gt;');
    expect(post.messages[0]).toContain('<b>Red &amp; Gold</b>');
    expect(post.messages[0]).toContain('<b>12 345,5');
    expect(post.messages[0]).toContain('9 000,25');
    expect(post.messages[0]!.length).toBeLessThanOrEqual(4_096);
  });
});
