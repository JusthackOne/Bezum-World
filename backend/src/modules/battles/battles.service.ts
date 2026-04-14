import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EquipmentSlotType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import type {
  BattlePlayerDto,
  BattlePlayerEquipmentDto,
  BattlePlayerStatsDto,
  BattlePlayersResponseDto,
  StartBattleResponseDto,
} from './dto';
import { BattleRepository, type BattlePlayerRecord } from './repositories';

const BASE_GAME_SCORE_REWARD = 100;
const BASE_COIN_REWARD = 100;
const MIN_COIN_REWARD = 10;
const MAX_COIN_REWARD = 300;
const WIN_CHANCE_SIMULATION_ROUNDS = 400;

interface FinalBattleStats {
  strength: number;
  intelligence: number;
  charisma: number;
  endurance: number;
}

@Injectable()
export class BattlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly battleRepository: BattleRepository,
    private readonly configService: ConfigService,
  ) {}

  async getBattlePlayers(currentUserId: string): Promise<BattlePlayersResponseDto> {
    const [currentUser, opponents] = await Promise.all([
      this.battleRepository.findPlayerByIdWithEquipment(currentUserId),
      this.battleRepository.findOpponentsForAttacker(currentUserId),
    ]);

    if (!currentUser) {
      throw new NotFoundException('User is not found');
    }

    const currentUserStats = this.getFinalStats(currentUser);
    const currentUserPower = this.calculatePower(currentUserStats);
    const dayRange = this.getUtcDayRange(new Date());
    const battledDefenderIds = await this.battleRepository.findBattledDefenderIdsInRange(
      currentUserId,
      dayRange.start,
      dayRange.end,
    );

    const players = opponents
      .map((opponent) => {
        const opponentStats = this.getFinalStats(opponent);
        const opponentPower = this.calculatePower(opponentStats);

        return {
          gameScore: opponent.gameScore,
          userId: opponent.id,
          username: opponent.username,
          avatar: this.toPublicImageUrl(opponent.avatarUrl),
          equipment: this.toBattleEquipment(opponent),
          stats: this.toBattleStatsDto(opponentStats),
          winChancePercent: this.estimateWinChancePercent(currentUserPower, opponentPower),
          isBattleAvailableToday: !battledDefenderIds.has(opponent.id),
        };
      })
      .sort((left, right) => {
        const leftPower = this.calculatePower(left.stats);
        const rightPower = this.calculatePower(right.stats);

        if (rightPower !== leftPower) {
          return rightPower - leftPower;
        }

        if (right.gameScore !== left.gameScore) {
          return right.gameScore - left.gameScore;
        }

        return left.username.localeCompare(right.username);
      })
      .map<BattlePlayerDto>((entry) => ({
        userId: entry.userId,
        username: entry.username,
        avatar: entry.avatar,
        equipment: entry.equipment,
        stats: entry.stats,
        winChancePercent: entry.winChancePercent,
        isBattleAvailableToday: entry.isBattleAvailableToday,
      }));

    return {
      players,
    };
  }

  async startBattle(currentUserId: string, opponentUserId: string): Promise<StartBattleResponseDto> {
    if (currentUserId === opponentUserId) {
      throw new BadRequestException('You cannot battle yourself');
    }

    return this.prismaSerializableTransaction(async (tx) => {
      const [currentUser, opponentUser] = await Promise.all([
        this.battleRepository.findPlayerByIdWithEquipment(currentUserId, tx),
        this.battleRepository.findPlayerByIdWithEquipment(opponentUserId, tx),
      ]);

      if (!currentUser) {
        throw new NotFoundException('User is not found');
      }

      if (!opponentUser) {
        throw new NotFoundException('Opponent is not found');
      }

      const dayRange = this.getUtcDayRange(new Date());
      const hasBattleToday = await this.battleRepository.hasBattleForPairInRange(
        currentUserId,
        opponentUserId,
        dayRange.start,
        dayRange.end,
        tx,
      );

      if (hasBattleToday) {
        throw new ConflictException('Already battled today');
      }

      const currentUserStats = this.getFinalStats(currentUser);
      const opponentStats = this.getFinalStats(opponentUser);

      const currentUserPower = this.calculatePower(currentUserStats);
      const opponentPower = this.calculatePower(opponentStats);
      const noisyCurrentUserPower = this.applyPowerNoise(currentUserPower);
      const noisyOpponentPower = this.applyPowerNoise(opponentPower);
      const delta = noisyCurrentUserPower - noisyOpponentPower;
      const attackerWinProbability = 1 / (1 + Math.exp(-delta / 10));
      const attackerWon = Math.random() < attackerWinProbability;

      const winner = attackerWon ? currentUser : opponentUser;
      const loser = attackerWon ? opponentUser : currentUser;
      const winnerPower = attackerWon ? currentUserPower : opponentPower;
      const loserPower = attackerWon ? opponentPower : currentUserPower;
      const transferAmount = this.calculateCoinReward(winnerPower, loserPower, loser.balance);
      const gameScoreReward = BASE_GAME_SCORE_REWARD;

      await this.battleRepository.transferCoinsAndApplyGameScore(
        winner.id,
        loser.id,
        transferAmount,
        gameScoreReward,
        tx,
      );

      await this.battleRepository.createBattleLog(
        {
          attackerUserId: currentUserId,
          defenderUserId: opponentUserId,
          attackerPower: noisyCurrentUserPower,
          defenderPower: noisyOpponentPower,
          attackerWinProbability,
          winnerUserId: winner.id,
          loserUserId: loser.id,
          transferredCoins: transferAmount,
          gameScoreReward,
        },
        tx,
      );

      const updatedCurrentUser = await this.battleRepository.findAccountBalanceAndGameScore(
        currentUserId,
        tx,
      );

      if (!updatedCurrentUser) {
        throw new NotFoundException('User is not found after battle');
      }

      return {
        result: attackerWon ? 'win' : 'lose',
        transferredCoins: transferAmount,
        ...(attackerWon ? { gameScoreReward } : {}),
        updatedCurrentUserBalance: updatedCurrentUser.balance,
        updatedCurrentUserGameScore: updatedCurrentUser.gameScore,
        battleAvailableTomorrow: true,
      };
    });
  }

  private async prismaSerializableTransaction<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(callback, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private getFinalStats(player: BattlePlayerRecord): FinalBattleStats {
    const bonusStrength = player.equipment.reduce((sum, slot) => sum + (slot.item?.strength ?? 0), 0);
    const bonusCharisma = player.equipment.reduce((sum, slot) => sum + (slot.item?.charisma ?? 0), 0);
    const bonusIntelligence = player.equipment.reduce(
      (sum, slot) => sum + (slot.item?.intelligence ?? 0),
      0,
    );

    return {
      strength: player.strength + bonusStrength,
      intelligence: player.intelligence + bonusIntelligence,
      charisma: player.charisma + bonusCharisma,
      endurance: player.endurance,
    };
  }

  private toBattleStatsDto(stats: FinalBattleStats): BattlePlayerStatsDto {
    return {
      strength: stats.strength,
      intelligence: stats.intelligence,
      charisma: stats.charisma,
      endurance: stats.endurance,
    };
  }

  private calculatePower(stats: FinalBattleStats): number {
    return (
      stats.strength * 0.35 +
      stats.endurance * 0.25 +
      stats.intelligence * 0.2 +
      stats.charisma * 0.2
    );
  }

  private applyPowerNoise(power: number): number {
    return power * (0.9 + Math.random() * 0.2);
  }

  private estimateWinChancePercent(currentUserPower: number, opponentPower: number): number {
    let wins = 0;

    for (let index = 0; index < WIN_CHANCE_SIMULATION_ROUNDS; index += 1) {
      const noisyCurrent = this.applyPowerNoise(currentUserPower);
      const noisyOpponent = this.applyPowerNoise(opponentPower);
      const delta = noisyCurrent - noisyOpponent;
      const winProbability = 1 / (1 + Math.exp(-delta / 10));

      if (Math.random() < winProbability) {
        wins += 1;
      }
    }

    const probability = wins / WIN_CHANCE_SIMULATION_ROUNDS;
    return Number((probability * 100).toFixed(2));
  }

  private calculateCoinReward(winnerPower: number, loserPower: number, loserBalance: number): number {
    if (loserBalance <= 0) {
      return 0;
    }

    const powerRatio = loserPower <= 0 ? 1 : loserPower / Math.max(winnerPower, 1);
    const scaledReward = Math.round(BASE_COIN_REWARD * powerRatio);
    const clampedReward = this.clamp(scaledReward, MIN_COIN_REWARD, MAX_COIN_REWARD);

    return Math.min(clampedReward, loserBalance);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private getUtcDayRange(value: Date): { start: Date; end: Date } {
    const start = new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 0, 0, 0, 0),
    );
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return { start, end };
  }

  private toBattleEquipment(player: BattlePlayerRecord): BattlePlayerEquipmentDto {
    return player.equipment.reduce<BattlePlayerEquipmentDto>((accumulator, equipmentSlot) => {
      if (!equipmentSlot.item) {
        return accumulator;
      }

      const mappedSlot = this.mapEquipmentSlot(equipmentSlot.slotType);
      accumulator[mappedSlot] = {
        id: equipmentSlot.item.id,
        name: equipmentSlot.item.name,
        slot_type: equipmentSlot.item.slotType,
        description: equipmentSlot.item.description,
        image_url: this.toPublicImageUrl(equipmentSlot.item.imageUrl),
        strength: equipmentSlot.item.strength,
        charisma: equipmentSlot.item.charisma,
        agility: equipmentSlot.item.agility,
        intelligence: equipmentSlot.item.intelligence,
        price: equipmentSlot.item.price,
        rarity: equipmentSlot.item.rarity,
        durability: equipmentSlot.item.durability,
        created_at: equipmentSlot.item.createdAt.toISOString(),
      };

      return accumulator;
    }, {});
  }

  private mapEquipmentSlot(
    slotType: EquipmentSlotType,
  ): keyof BattlePlayerEquipmentDto {
    switch (slotType) {
      case EquipmentSlotType.HELMET:
        return 'helmet';
      case EquipmentSlotType.ARMOR:
        return 'chest';
      case EquipmentSlotType.PANTS:
        return 'pants';
      case EquipmentSlotType.BOOTS:
        return 'boots';
      case EquipmentSlotType.LEFT_HAND:
        return 'leftWeapon';
      case EquipmentSlotType.RIGHT_HAND:
        return 'rightWeapon';
      default:
        throw new BadRequestException(`Unsupported equipment slot: ${slotType}`);
    }
  }

  private toPublicImageUrl(imageUrl: string | null): string | null {
    if (!imageUrl) {
      return null;
    }

    const appDomain = this.configService.get('APP_DOMAIN', { infer: true });
    const appPort = this.configService.get('PORT', { infer: true });
    return `${appDomain}:${appPort}${imageUrl}`;
  }
}
