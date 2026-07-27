import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface SlotLeaderboardUserRecord {
  userId: string;
  username: string;
  avatar: string | null;
  totalWinnings: number;
  totalLosses: number;
}

@Injectable()
export class SlotsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async applySpinBalanceChange(
    accountId: string,
    bet: number,
    payout: number,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const result = await tx.account.updateMany({
      where: {
        id: accountId,
        balance: { gte: bet },
      },
      data: {
        balance: { increment: payout - bet },
      },
    });

    return result.count > 0;
  }

  async incrementStatistics(
    accountId: string,
    winnings: number,
    losses: number,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await tx.slotStatistics.upsert({
      where: { userId: accountId },
      create: {
        userId: accountId,
        totalWinnings: winnings,
        totalLosses: losses,
      },
      update: {
        totalWinnings: { increment: winnings },
        totalLosses: { increment: losses },
      },
    });
  }

  async findUsersForLeaderboard(): Promise<SlotLeaderboardUserRecord[]> {
    const users = await this.prisma.account.findMany({
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        slotStatistics: {
          select: {
            totalWinnings: true,
            totalLosses: true,
          },
        },
      },
    });

    return users.map((user) => ({
      userId: user.id,
      username: user.username,
      avatar: user.avatarUrl,
      totalWinnings: user.slotStatistics?.totalWinnings ?? 0,
      totalLosses: user.slotStatistics?.totalLosses ?? 0,
    }));
  }

  async accountExists(accountId: string, tx: Prisma.TransactionClient): Promise<boolean> {
    const account = await tx.account.findUnique({
      where: { id: accountId },
      select: { id: true },
    });

    return account !== null;
  }
}
