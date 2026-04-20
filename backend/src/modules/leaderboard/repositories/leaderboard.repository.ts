import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface LeaderboardUserRecord {
  userId: string;
  username: string;
  avatar: string | null;
  totalGameScore: number;
}

@Injectable()
export class LeaderboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findUsersForLeaderboard(): Promise<LeaderboardUserRecord[]> {
    const users = await this.prisma.account.findMany({
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        gameScore: true,
      },
    });

    return users.map((user) => ({
      userId: user.id,
      username: user.username,
      avatar: user.avatarUrl,
      totalGameScore: user.gameScore,
    }));
  }

  async findPeriodGameScoreByUser(
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Map<string, number>> {
    const groupedSubmissions = await this.prisma.taskSubmission.groupBy({
      by: ['userId'],
      where: {
        createdAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
      _sum: {
        grantedGameScore: true,
      },
    });

    return new Map(
      groupedSubmissions.map((submission) => [
        submission.userId,
        submission._sum.grantedGameScore ?? 0,
      ]),
    );
  }
}
