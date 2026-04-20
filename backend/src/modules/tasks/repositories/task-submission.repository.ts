import { Injectable } from '@nestjs/common';
import { TaskType, type Prisma, type TaskSubmission } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface CreateTaskSubmissionInput {
  taskId: string;
  userId: string;
  proofImage: string | null;
  grantedGameScore: number;
}

@Injectable()
export class TaskSubmissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    input: CreateTaskSubmissionInput,
    tx: Prisma.TransactionClient,
  ): Promise<TaskSubmission> {
    return this.getClient(tx).taskSubmission.create({
      data: {
        taskId: input.taskId,
        userId: input.userId,
        proofImage: input.proofImage,
        grantedGameScore: input.grantedGameScore,
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

  async countByTaskGroupedForUserInRange(
    userId: string,
    rangeStart: Date,
    rangeEnd: Date,
    tx?: Prisma.TransactionClient,
  ): Promise<Map<string, number>> {
    const groupedSubmissions = await this.getClient(tx).taskSubmission.groupBy({
      by: ['taskId'],
      where: {
        userId,
        createdAt: {
          gte: rangeStart,
          lt: rangeEnd,
        },
      },
      _count: {
        taskId: true,
      },
    });

    return new Map(
      groupedSubmissions.map((submission) => [submission.taskId, submission._count.taskId]),
    );
  }

  async findCompletedEventTaskIds(tx?: Prisma.TransactionClient): Promise<Set<string>> {
    const completedEventSubmissions = await this.getClient(tx).taskSubmission.findMany({
      where: {
        task: {
          type: TaskType.event,
        },
      },
      select: {
        taskId: true,
      },
      distinct: ['taskId'],
    });

    return new Set(completedEventSubmissions.map((submission) => submission.taskId));
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
