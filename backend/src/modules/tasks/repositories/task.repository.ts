import { Injectable } from '@nestjs/common';
import { type Prisma, type Task, TaskType } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface CreateTaskInput {
  type: TaskType;
  title: string;
  description: string | null;
  image: string | null;
  rewardMoney: number;
  rewardGameScore: number | null;
  rewardAttributes: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  requiresProofImage: boolean;
  submissionLimit: number | null;
}

export interface UpdateTaskInput {
  type?: TaskType;
  title?: string;
  description?: string | null;
  image?: string | null;
  rewardMoney?: number;
  rewardGameScore?: number | null;
  rewardAttributes?: Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput;
  requiresProofImage?: boolean;
  submissionLimit?: number | null;
}

export interface FindAdminTasksInput {
  search?: string;
  type?: TaskType;
  skip: number;
  take: number;
}

export interface FindAdminTasksResult {
  items: Task[];
  total: number;
}

export interface FindClientTasksInput {
  search?: string;
  type?: TaskType;
}

@Injectable()
export class TaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTaskInput, tx?: Prisma.TransactionClient): Promise<Task> {
    return this.getClient(tx).task.create({
      data: {
        type: input.type,
        title: input.title,
        description: input.description,
        image: input.image,
        rewardMoney: input.rewardMoney,
        rewardGameScore: input.rewardGameScore,
        rewardAttributes: input.rewardAttributes,
        requiresProofImage: input.requiresProofImage,
        submissionLimit: input.submissionLimit,
      },
    });
  }

  async updateById(
    id: string,
    input: UpdateTaskInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Task> {
    return this.getClient(tx).task.update({
      where: { id },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.image !== undefined ? { image: input.image } : {}),
        ...(input.rewardMoney !== undefined ? { rewardMoney: input.rewardMoney } : {}),
        ...(input.rewardGameScore !== undefined ? { rewardGameScore: input.rewardGameScore } : {}),
        ...(input.rewardAttributes !== undefined
          ? { rewardAttributes: input.rewardAttributes }
          : {}),
        ...(input.requiresProofImage !== undefined
          ? { requiresProofImage: input.requiresProofImage }
          : {}),
        ...(input.submissionLimit !== undefined ? { submissionLimit: input.submissionLimit } : {}),
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Task | null> {
    return this.getClient(tx).task.findUnique({
      where: { id },
    });
  }

  async deleteById(id: string, tx?: Prisma.TransactionClient): Promise<boolean> {
    const result = await this.getClient(tx).task.deleteMany({
      where: { id },
    });

    return result.count > 0;
  }

  async findByIdForUpdate(id: string, tx: Prisma.TransactionClient): Promise<Task | null> {
    const lockedRows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "tasks"
      WHERE "id" = ${id}
      FOR UPDATE
    `;

    if (lockedRows.length === 0) {
      return null;
    }

    return this.findById(id, tx);
  }

  async findManyForAdmin(input: FindAdminTasksInput): Promise<FindAdminTasksResult> {
    const where = this.buildWhere(input.search, input.type);

    const [total, items] = await this.prisma.$transaction([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        skip: input.skip,
        take: input.take,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      total,
      items,
    };
  }

  async findManyForClient(input: FindClientTasksInput): Promise<Task[]> {
    return this.prisma.task.findMany({
      where: this.buildWhere(input.search, input.type),
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private buildWhere(search?: string, type?: TaskType): Prisma.TaskWhereInput {
    const normalizedSearch = search?.trim();

    return {
      ...(type ? { type } : {}),
      ...(normalizedSearch
        ? {
            title: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          }
        : {}),
    };
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
