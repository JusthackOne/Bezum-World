import { Injectable } from '@nestjs/common';
import { type BattleAttribute, type Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';

export interface BattleEquippedItemRecord {
  id: string;
  slotType: 'HELMET' | 'ARMOR' | 'PANTS' | 'BOOTS' | 'LEFT_HAND' | 'RIGHT_HAND' | 'ACCESSORY';
  name: string;
  description: string | null;
  imageUrl: string | null;
  strength: number | null;
  charisma: number | null;
  agility: number | null;
  intelligence: number | null;
  price: number;
  rarity: 'unterlyanskiy' | 'basic_minimum' | 'sigma' | 'bezumnyy';
  durability: number | null;
  createdAt: Date;
}

export interface BattleEquipmentSlotRecord {
  slotType: 'HELMET' | 'ARMOR' | 'PANTS' | 'BOOTS' | 'LEFT_HAND' | 'RIGHT_HAND' | 'ACCESSORY';
  position: number;
  item: BattleEquippedItemRecord | null;
}

export interface BattlePlayerRecord {
  id: string;
  username: string;
  avatarUrl: string | null;
  balance: number;
  gameScore: number;
  strength: number;
  charisma: number;
  endurance: number;
  intelligence: number;
  equipment: BattleEquipmentSlotRecord[];
}

export interface CreateBattleLogInput {
  dailyBattleId: string;
  attackerUserId: string;
  defenderUserId: string;
  attackerPower: number;
  defenderPower: number;
  attackerWinProbability: number;
  winnerUserId: string;
  loserUserId: string;
  transferredCoins: number;
  gameScoreReward: number;
}

export interface CreateDailyBattleInput {
  playerOneId: string;
  playerTwoId: string;
  dayStartsAt: Date;
  featuredAttribute: BattleAttribute;
}

export interface DailyBattleRecord extends CreateDailyBattleInput {
  id: string;
  completedAt: Date | null;
}

@Injectable()
export class BattleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOpponentsForAttacker(attackerUserId: string): Promise<BattlePlayerRecord[]> {
    return this.prisma.account.findMany({
      where: {
        id: {
          not: attackerUserId,
        },
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        balance: true,
        gameScore: true,
        strength: true,
        charisma: true,
        endurance: true,
        intelligence: true,
        equipment: {
          orderBy: {
            position: 'asc',
          },
          select: {
            slotType: true,
            position: true,
            item: {
              select: {
                id: true,
                slotType: true,
                name: true,
                description: true,
                imageUrl: true,
                strength: true,
                charisma: true,
                agility: true,
                intelligence: true,
                price: true,
                rarity: true,
                durability: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
  }

  async findPlayerByIdWithEquipment(
    userId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<BattlePlayerRecord | null> {
    return this.getClient(tx).account.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        balance: true,
        gameScore: true,
        strength: true,
        charisma: true,
        endurance: true,
        intelligence: true,
        equipment: {
          orderBy: {
            position: 'asc',
          },
          select: {
            slotType: true,
            position: true,
            item: {
              select: {
                id: true,
                slotType: true,
                name: true,
                description: true,
                imageUrl: true,
                strength: true,
                charisma: true,
                agility: true,
                intelligence: true,
                price: true,
                rarity: true,
                durability: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
  }

  async createDailyBattles(inputs: CreateDailyBattleInput[]): Promise<void> {
    if (inputs.length === 0) {
      return;
    }

    await this.prisma.dailyBattle.createMany({
      data: inputs,
      skipDuplicates: true,
    });
  }

  async findDailyBattlesForPlayer(
    playerId: string,
    dayStartsAt: Date,
  ): Promise<DailyBattleRecord[]> {
    return this.prisma.dailyBattle.findMany({
      where: {
        dayStartsAt,
        OR: [{ playerOneId: playerId }, { playerTwoId: playerId }],
      },
      select: {
        id: true,
        playerOneId: true,
        playerTwoId: true,
        dayStartsAt: true,
        featuredAttribute: true,
        completedAt: true,
      },
    });
  }

  async findOrCreateDailyBattle(
    input: CreateDailyBattleInput,
    tx: Prisma.TransactionClient,
  ): Promise<DailyBattleRecord> {
    return tx.dailyBattle.upsert({
      where: {
        playerOneId_playerTwoId_dayStartsAt: {
          playerOneId: input.playerOneId,
          playerTwoId: input.playerTwoId,
          dayStartsAt: input.dayStartsAt,
        },
      },
      create: input,
      update: {},
      select: {
        id: true,
        playerOneId: true,
        playerTwoId: true,
        dayStartsAt: true,
        featuredAttribute: true,
        completedAt: true,
      },
    });
  }

  async completeDailyBattle(
    dailyBattleId: string,
    completedAt: Date,
    tx: Prisma.TransactionClient,
  ): Promise<boolean> {
    const result = await tx.dailyBattle.updateMany({
      where: {
        id: dailyBattleId,
        completedAt: null,
      },
      data: {
        completedAt,
      },
    });

    return result.count === 1;
  }

  async createBattleLog(input: CreateBattleLogInput, tx: Prisma.TransactionClient): Promise<void> {
    await this.getClient(tx).battleLog.create({
      data: {
        dailyBattleId: input.dailyBattleId,
        attackerUserId: input.attackerUserId,
        defenderUserId: input.defenderUserId,
        attackerPower: input.attackerPower,
        defenderPower: input.defenderPower,
        attackerWinProbability: input.attackerWinProbability,
        winnerUserId: input.winnerUserId,
        loserUserId: input.loserUserId,
        transferredCoins: input.transferredCoins,
        gameScoreReward: input.gameScoreReward,
      },
    });
  }

  async applyWinnerBattleRewards(
    winnerUserId: string,
    coinReward: number,
    gameScoreReward: number,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    await this.getClient(tx).account.update({
      where: {
        id: winnerUserId,
      },
      data: {
        balance: {
          increment: coinReward,
        },
        ...(gameScoreReward > 0
          ? {
              gameScore: {
                increment: gameScoreReward,
              },
            }
          : {}),
      },
    });
  }

  async findAccountBalanceAndGameScore(
    userId: string,
    tx: Prisma.TransactionClient,
  ): Promise<{ balance: number; gameScore: number } | null> {
    return this.getClient(tx).account.findUnique({
      where: {
        id: userId,
      },
      select: {
        balance: true,
        gameScore: true,
      },
    });
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaService | Prisma.TransactionClient {
    return tx ?? this.prisma;
  }
}
