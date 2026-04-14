import { Injectable } from '@nestjs/common';
import { type Prisma, type TaskSubmission } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface CreateTaskSubmissionInput {
  taskId: string;
  userId: string;
  proofImage: string | null;
}

@Injectable()
export class TaskSubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTaskSubmissionInput, tx: Prisma.TransactionClient): Promise<TaskSubmission> {
    return this.getClient(tx).taskSubmission.create({
      data: {
        taskId: input.taskId,
        userId: input.userId,
        proofImage: input.proofImage,
      },
    });
  }

  async countByTaskAndUserInRange(
    taskId: string,
    userId: string,
    rangeStart: Date,
    rangeEnd: Date,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    return this.getClient(tx).taskSubmission.count({
      where: {
        taskId,
        userId,
        createdAt: {
          gte: rangeStart,
          lt: rangeEnd,
        },
      },
    });
  }

  async existsByTask(taskId: string, tx: Prisma.TransactionClient): Promise<boolean> {
    const existingSubmission = await this.getClient(tx).taskSubmission.findFirst({
      where: {
        taskId,
      },
      select: {
        id: true,
      },
    });

    return Boolean(existingSubmission);
  }

  async findByUserId(userId: string): Promise<TaskSubmission[]> {
    return this.prisma.taskSubmission.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
