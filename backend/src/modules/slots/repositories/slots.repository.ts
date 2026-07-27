import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

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

  async accountExists(accountId: string, tx: Prisma.TransactionClient): Promise<boolean> {
    const account = await tx.account.findUnique({
      where: { id: accountId },
      select: { id: true },
    });

    return account !== null;
  }
}
