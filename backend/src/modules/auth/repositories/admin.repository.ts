import { Injectable } from '@nestjs/common';
import type { Admin, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

interface CreateAdminInput {
  username: string;
  passwordHash: string;
}

@Injectable()
export class AdminRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findSingleton(): Promise<Admin | null> {
    return this.prisma.admin.findUnique({
      where: {
        singletonKey: 'singleton',
      },
    });
  }

  async findByUsername(username: string): Promise<Admin | null> {
    return this.prisma.admin.findUnique({
      where: { username },
    });
  }

  async findById(id: string): Promise<Admin | null> {
    return this.prisma.admin.findUnique({
      where: { id },
    });
  }

  async createSingleton(input: CreateAdminInput): Promise<Admin> {
    return this.prisma.admin.create({
      data: {
        username: input.username,
        passwordHash: input.passwordHash,
      },
    });
  }

  async updateLastTimeLoggedIn(
    id: string,
    lastTimeLoggedIn: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<Admin> {
    return this.getClient(tx).admin.update({
      where: { id },
      data: {
        lastTimeLoggedIn,
      },
    });
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
