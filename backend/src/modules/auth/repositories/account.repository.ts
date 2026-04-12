import { Injectable } from '@nestjs/common';
import type { Account, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface CreateAccountInput {
  username: string;
  avatarUrl?: string | undefined;
  strength?: number | undefined;
  charisma?: number | undefined;
  endurance?: number | undefined;
  intelligence?: number | undefined;
}

@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAccountInput, tx?: Prisma.TransactionClient): Promise<Account> {
    return this.getClient(tx).account.create({
      data: {
        username: input.username,
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
        ...(input.strength !== undefined ? { strength: input.strength } : {}),
        ...(input.charisma !== undefined ? { charisma: input.charisma } : {}),
        ...(input.endurance !== undefined ? { endurance: input.endurance } : {}),
        ...(input.intelligence !== undefined ? { intelligence: input.intelligence } : {}),
      },
    });
  }

  async findById(id: string): Promise<Account | null> {
    return this.prisma.account.findUnique({
      where: { id },
    });
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

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
