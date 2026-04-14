import { Injectable } from '@nestjs/common';

import type { LeaderboardResponseDto } from './dto';
import { LeaderboardRepository, type LeaderboardUserRecord } from './repositories';
import { LeaderboardPeriod } from './types/leaderboard-period.type';

interface LeaderboardScoreRecord extends LeaderboardUserRecord {
  periodGameScore: number;
  score: number;
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly leaderboardRepository: LeaderboardRepository) {}

  async getLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardResponseDto> {
    const users = await this.leaderboardRepository.findUsersForLeaderboard();
    const usersWithScores = await this.resolveScoresByPeriod(users, period);
    const sortedUsers = this.sortLeaderboard(usersWithScores);

    return {
      period,
      leaders: sortedUsers.map((entry, index) => ({
        userId: entry.userId,
        username: entry.username,
        avatar: entry.avatar,
        totalGameScore: entry.totalGameScore,
        periodGameScore: entry.periodGameScore,
        score: entry.score,
        rank: index + 1,
      })),
    };
  }

  private async resolveScoresByPeriod(
    users: LeaderboardUserRecord[],
    period: LeaderboardPeriod,
  ): Promise<LeaderboardScoreRecord[]> {
    if (period === LeaderboardPeriod.all) {
      return users.map((user) => ({
        ...user,
        periodGameScore: user.totalGameScore,
        score: user.totalGameScore,
      }));
    }

    const now = new Date();
    const periodMs =
      period === LeaderboardPeriod.weekly ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    const periodStart = new Date(now.getTime() - periodMs);

    const periodScoresByUser = await this.leaderboardRepository.findPeriodGameScoreByUser(
      periodStart,
      now,
    );

    return users.map((user) => {
      const periodGameScore = periodScoresByUser.get(user.userId) ?? 0;

      return {
        ...user,
        periodGameScore,
        score: periodGameScore,
      };
    });
  }

  private sortLeaderboard(entries: LeaderboardScoreRecord[]): LeaderboardScoreRecord[] {
    return [...entries].sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.totalGameScore !== left.totalGameScore) {
        return right.totalGameScore - left.totalGameScore;
      }

      return left.username.localeCompare(right.username);
    });
  }
}
