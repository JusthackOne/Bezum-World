import { Injectable } from '@nestjs/common';
import { BattleEventResult, GameEventType, type Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface CreatePurchaseEventInput {
  userId: string;
  itemId: string;
}

export interface CreateBattleEventInput {
  challengerId: string;
  opponentId: string;
  winnerId: string;
  result: BattleEventResult;
  gameScoreReward: number;
  goldReward: number;
}

export interface CreateTaskCompletedEventInput {
  userId: string;
  taskId: string;
  taskSubmissionId: string;
  proofImage: string | null;
}

export type GameEventRecord = Prisma.GameEventGetPayload<{
  include: {
    purchaseUser: {
      select: {
        id: true;
        username: true;
        avatarUrl: true;
      };
    };
    item: true;
    challenger: {
      select: {
        id: true;
        username: true;
        avatarUrl: true;
      };
    };
    opponent: {
      select: {
        id: true;
        username: true;
        avatarUrl: true;
      };
    };
    winner: {
      select: {
        id: true;
        username: true;
        avatarUrl: true;
      };
    };
    taskCompletedUser: {
      select: {
        id: true;
        username: true;
        avatarUrl: true;
      };
    };
    task: {
      select: {
        id: true;
        type: true;
        title: true;
        image: true;
        rewardMoney: true;
        rewardGameScore: true;
        rewardAttributes: true;
      };
    };
    taskSubmission: {
      select: {
        id: true;
      };
    };
  };
}>;

@Injectable()
export class EventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPurchaseEvent(
    input: CreatePurchaseEventInput,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.getClient(tx).gameEvent.create({
      data: {
        type: GameEventType.PURCHASE,
        purchaseUserId: input.userId,
        itemId: input.itemId,
      },
    });
  }

  async createBattleEvent(
    input: CreateBattleEventInput,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.getClient(tx).gameEvent.create({
      data: {
        type: GameEventType.BATTLE,
        challengerId: input.challengerId,
        opponentId: input.opponentId,
        winnerId: input.winnerId,
        battleResult: input.result,
        gameScoreReward: input.gameScoreReward,
        goldReward: input.goldReward,
      },
    });
  }

  async createTaskCompletedEvent(
    input: CreateTaskCompletedEventInput,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.getClient(tx).gameEvent.create({
      data: {
        type: GameEventType.TASK_COMPLETED,
        taskCompletedUserId: input.userId,
        taskId: input.taskId,
        taskSubmissionId: input.taskSubmissionId,
        proofImage: input.proofImage,
      },
    });
  }

  async findEvents(options: {
    type?: GameEventType;
    page: number;
    limit: number;
  }): Promise<{ events: GameEventRecord[]; total: number }> {
    const where: Prisma.GameEventWhereInput = options.type ? { type: options.type } : {};
    const [events, total] = await Promise.all([
      this.prisma.gameEvent.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: (options.page - 1) * options.limit,
        take: options.limit,
        include: {
          purchaseUser: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          item: true,
          challenger: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          opponent: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          winner: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          taskCompletedUser: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          task: {
            select: {
              id: true,
              type: true,
              title: true,
              image: true,
              rewardMoney: true,
              rewardGameScore: true,
              rewardAttributes: true,
            },
          },
          taskSubmission: {
            select: {
              id: true,
            },
          },
        },
      }),
      this.prisma.gameEvent.count({ where }),
    ]);

    return { events, total };
  }

  private getClient(tx: Prisma.TransactionClient): Prisma.TransactionClient {
    return tx;
  }
}
