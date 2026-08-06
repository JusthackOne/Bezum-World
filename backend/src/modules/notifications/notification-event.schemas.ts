import { NotificationEventType, type Prisma } from '@prisma/client';
import { z } from 'zod';

const nullableTextSchema = z.string().nullable();

export const taskSuggestedPayloadSchema = z.object({
  suggestionId: z.string().min(1),
  title: z.string().min(1),
  description: nullableTextSchema,
  image: nullableTextSchema,
  creatorUsername: z.string().min(1),
  taskType: z.enum(['daily', 'weekly', 'event']),
  createdAt: z.string().datetime(),
});

export const bossActivatedPayloadSchema = z.object({
  battleId: z.string().min(1),
  name: z.string().min(1),
  description: nullableTextSchema,
  imageUrl: nullableTextSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export const bossDefeatedPayloadSchema = z.object({
  battleId: z.string().min(1),
  name: z.string().min(1),
  imageUrl: nullableTextSchema,
  defeatedAt: z.string().datetime(),
  topPlayers: z.array(
    z.object({
      place: z.number().int().positive(),
      username: z.string().min(1),
      totalDamage: z.number().int().nonnegative(),
    }),
  ),
});

export const dailyDigestPayloadSchema = z.object({
  date: z.iso.date(),
  completedTasksCount: z.number().int().nonnegative(),
  leaderboard: z.array(
    z.object({
      place: z.number().int().positive(),
      username: z.string().min(1),
      gameScore: z.number().int().nonnegative(),
    }),
  ),
  purchases: z.array(
    z.object({
      buyerUsername: z.string().min(1),
      itemName: z.string().min(1),
      rarity: z.enum(['unterlyanskiy', 'basic_minimum', 'sigma', 'bezumnyy']),
    }),
  ),
});

const civilizationResourceAmountSchema = z.string().regex(/^\d+(?:\.\d+)?$/);

export const civilizationGameCompletedPayloadSchema = z.object({
  gameId: z.string().min(1),
  gameName: z.string().min(1),
  completedAt: z.string().datetime(),
  reason: z.enum(['TOWN_HALL_CAPTURED', 'END_TIME_REACHED', 'ADMIN_FORCE_COMPLETED']),
  winnerTeamId: z.string().min(1).nullable(),
  teams: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        score: civilizationResourceAmountSchema,
        playerCount: z.number().int().nonnegative(),
        gold: civilizationResourceAmountSchema,
        attributes: z.object({
          strength: civilizationResourceAmountSchema,
          charisma: civilizationResourceAmountSchema,
          endurance: civilizationResourceAmountSchema,
          intelligence: civilizationResourceAmountSchema,
        }),
      }),
    )
    .length(2),
});

export function parseNotificationPayload(
  eventType: NotificationEventType,
  payload: Prisma.JsonValue,
) {
  switch (eventType) {
    case NotificationEventType.TASK_SUGGESTED:
      return taskSuggestedPayloadSchema.parse(payload);
    case NotificationEventType.BOSS_ACTIVATED:
      return bossActivatedPayloadSchema.parse(payload);
    case NotificationEventType.BOSS_DEFEATED:
      return bossDefeatedPayloadSchema.parse(payload);
    case NotificationEventType.DAILY_DIGEST:
      return dailyDigestPayloadSchema.parse(payload);
    case NotificationEventType.CIVILIZATION_GAME_COMPLETED:
      return civilizationGameCompletedPayloadSchema.parse(payload);
  }
}
