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

export interface TaskCompletedNotificationPayload {
  taskId: string;
  submissionId: string;
  title: string;
  taskType: 'daily' | 'weekly' | 'event';
  completedByUsername: string;
  proofImage: string | null;
  completedAt: string;
  rewards: {
    money: number;
    gameScore: number;
    strength: number;
    intelligence: number;
    charisma: number;
    endurance: number;
  };
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

export interface CivilizationTeamResultPayload {
  id: string;
  name: string;
  score: string;
  playerCount: number;
  gold: string;
  attributes: {
    strength: string;
    charisma: string;
    endurance: string;
    intelligence: string;
  };
}

export interface CivilizationGameCompletedNotificationPayload {
  gameId: string;
  gameName: string;
  completedAt: string;
  reason: 'TOWN_HALL_CAPTURED' | 'END_TIME_REACHED' | 'ADMIN_FORCE_COMPLETED';
  winnerTeamId: string | null;
  teams: CivilizationTeamResultPayload[];
}

export type NotificationEvent =
  | {
      type: typeof NotificationEventType.TASK_SUGGESTED;
      payload: TaskSuggestedNotificationPayload;
    }
  | {
      type: typeof NotificationEventType.TASK_COMPLETED;
      payload: TaskCompletedNotificationPayload;
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
    }
  | {
      type: typeof NotificationEventType.CIVILIZATION_GAME_COMPLETED;
      payload: CivilizationGameCompletedNotificationPayload;
    };

export interface TelegramNotificationJobData {
  outboxId: string;
}
