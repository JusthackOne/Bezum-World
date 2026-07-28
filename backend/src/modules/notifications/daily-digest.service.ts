import { Injectable } from '@nestjs/common';
import { NotificationEventType } from '@prisma/client';

import { getPreviousMoscowDayRange } from './moscow-day';
import { NotificationsService } from './notifications.service';
import { NotificationStatisticsRepository } from './repositories';

@Injectable()
export class DailyDigestService {
  constructor(
    private readonly statisticsRepository: NotificationStatisticsRepository,
    private readonly notificationsService: NotificationsService,
  ) {}

  async enqueueForTrigger(triggeredAt: Date): Promise<void> {
    const day = getPreviousMoscowDayRange(triggeredAt);
    const statistics = await this.statisticsRepository.getDailyStatistics(day.start, day.end);

    await this.notificationsService.enqueue(
      {
        type: NotificationEventType.DAILY_DIGEST,
        payload: {
          date: day.date,
          completedTasksCount: statistics.completedTasksCount,
          leaderboard: statistics.leaderboard.map((leader, index) => ({
            place: index + 1,
            username: leader.username,
            gameScore: leader.gameScore,
          })),
          purchases: statistics.purchases,
        },
      },
      `daily-digest:${day.date}`,
    );
  }
}
