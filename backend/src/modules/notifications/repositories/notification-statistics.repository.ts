import { Injectable } from '@nestjs/common';
import { GameEventType, type ItemRarity } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface DailyLeaderboardRecord {
  username: string;
  gameScore: number;
}

export interface DailyPurchaseRecord {
  buyerUsername: string;
  itemName: string;
  rarity: ItemRarity;
}

export interface DailyNotificationStatistics {
  completedTasksCount: number;
  leaderboard: DailyLeaderboardRecord[];
  purchases: DailyPurchaseRecord[];
}

@Injectable()
export class NotificationStatisticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getDailyStatistics(start: Date, end: Date): Promise<DailyNotificationStatistics> {
    const [completedTasksCount, leaders, purchaseEvents] = await Promise.all([
      this.prisma.taskSubmission.count({
        where: { createdAt: { gte: start, lt: end } },
      }),
      this.prisma.account.findMany({
        select: { username: true, gameScore: true },
        orderBy: [{ gameScore: 'desc' }, { username: 'asc' }],
        take: 3,
      }),
      this.prisma.gameEvent.findMany({
        where: {
          type: GameEventType.PURCHASE,
          createdAt: { gte: start, lt: end },
        },
        select: {
          purchaseUser: { select: { username: true } },
          item: { select: { name: true, rarity: true } },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    ]);

    return {
      completedTasksCount,
      leaderboard: leaders,
      purchases: purchaseEvents.flatMap((event) =>
        event.purchaseUser && event.item
          ? [
              {
                buyerUsername: event.purchaseUser.username,
                itemName: event.item.name,
                rarity: event.item.rarity,
              },
            ]
          : [],
      ),
    };
  }
}
