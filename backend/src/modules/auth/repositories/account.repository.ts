import { Injectable } from '@nestjs/common';
import type { Account, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
export type AccountWithAuthCode = Prisma.AccountGetPayload<{
  include: { authCode: true };
}>;

export interface CreateAccountInput {
  username: string;
  avatarUrl?: string | undefined;
  strength: number;
  charisma: number;
  endurance: number;
  intelligence: number;
}

export interface UpdateAccountInput {
  username?: string;
  avatarUrl?: string | null;
  balance?: number;
  strength?: number;
  charisma?: number;
  endurance?: number;
  intelligence?: number;
}

@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAccountInput, tx?: Prisma.TransactionClient): Promise<Account> {
    return this.getClient(tx).account.create({
      data: {
        username: input.username,
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        strength: input.strength,
        charisma: input.charisma,
        endurance: input.endurance,
        intelligence: input.intelligence,
      },
    });
  }

  async findById(id: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<Account[]> {
    return this.prisma.account.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAllWithAuthCode(): Promise<AccountWithAuthCode[]> {
    return this.prisma.account.findMany({
      include: {
        authCode: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findByIdInTransaction(
    id: string,
    tx: Prisma.TransactionClient,
  ): Promise<Account | null> {
    return this.getClient(tx).account.findUnique({
      where: { id },
    });
  }

  async decrementBalanceIfEnough(
    id: string,
    amount: number,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const result = await this.getClient(tx).account.updateMany({
      where: {
        id,
        balance: {
          gte: amount,
        },
      },
      data: {
        balance: {
          decrement: amount,
        },
      },
    });

    return result.count > 0;
  }

  async updateLastTimeLoggedIn(
    id: string,
    lastTimeLoggedIn: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<Account> {
    return this.getClient(tx).account.update({
      where: { id },
      data: { lastTimeLoggedIn },
    });
  }

  async updateById(id: string, input: UpdateAccountInput): Promise<Account> {
    return this.prisma.account.update({
      where: { id },
      data: input,
    });
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.prisma.account.deleteMany({
      where: { id },
    });

    return result.count > 0;
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
