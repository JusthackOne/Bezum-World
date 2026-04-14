import { Injectable } from '@nestjs/common';
import type { AuthCode, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

export type AuthCodeWithAccount = Prisma.AuthCodeGetPayload<{
  include: { account: true };
}>;

@Injectable()
export class AuthCodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByCodeWithAccount(code: string): Promise<AuthCodeWithAccount | null> {
    return this.prisma.authCode.findUnique({
      where: { code },
      include: { account: true },
    });
  }

  async create(code: string, accountId: string, tx?: Prisma.TransactionClient): Promise<AuthCode> {
    return this.getClient(tx).authCode.create({
      data: {
        code,
        accountId,
      },
    });
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
