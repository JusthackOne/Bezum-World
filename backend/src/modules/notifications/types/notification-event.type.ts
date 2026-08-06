import { NotificationEventType } from '@prisma/client';

export interface TaskSuggestedNotificationPayload {
  suggestionId: string;
  title: string;
  description: string | null;
  image: string | null;
  creatorUsername: string;
  taskType: 'daily' | 'weekly' | 'event';
  createdAt: string;
}

export interface BossActivatedNotificationPayload {
  battleId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string;
}

export interface BossLeaderboardEntryPayload {
  place: number;
  username: string;
  totalDamage: number;
}

export interface BossDefeatedNotificationPayload {
  battleId: string;
  name: string;
  imageUrl: string | null;
  defeatedAt: string;
  topPlayers: BossLeaderboardEntryPayload[];
}

export interface DailyDigestLeaderboardEntryPayload {
  place: number;
  username: string;
  gameScore: number;
}

export interface DailyDigestPurchasePayload {
  buyerUsername: string;
  itemName: string;
  rarity: 'unterlyanskiy' | 'basic_minimum' | 'sigma' | 'bezumnyy';
}

export interface DailyDigestNotificationPayload {
  date: string;
  completedTasksCount: number;
  leaderboard: DailyDigestLeaderboardEntryPayload[];
  purchases: DailyDigestPurchasePayload[];
}

export type NotificationEvent =
  | {
      type: typeof NotificationEventType.TASK_SUGGESTED;
      payload: TaskSuggestedNotificationPayload;
    }
  | {
      type: typeof NotificationEventType.BOSS_ACTIVATED;
      payload: BossActivatedNotificationPayload;
    }
  | {
      type: typeof NotificationEventType.BOSS_DEFEATED;
      payload: BossDefeatedNotificationPayload;
    }
  | {
      type: typeof NotificationEventType.DAILY_DIGEST;
      payload: DailyDigestNotificationPayload;
    };

export interface TelegramNotificationJobData {
  outboxId: string;
}
