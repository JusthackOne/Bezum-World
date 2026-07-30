import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BattleAttribute, EquipmentSlotType, Prisma } from '@prisma/client';

import { getMoscowDayRange } from '../../common/time/moscow-time';
import { PrismaService } from '../../database/prisma/prisma.service';
import { EventsService } from '../events/events.service';
import {
  calculateBattlesPower,
  calculateBattleWinProbability,
  FEATURED_ATTRIBUTE_MULTIPLIER,
  type FeaturedBattleAttribute,
} from './battle-power';
import type {
  BattlePlayerDto,
  BattlePlayerEquipmentDto,
  BattlePlayerStatsDto,
  BattlePlayersResponseDto,
  StartBattleResponseDto,
} from './dto';
import { BattleRepository, type BattlePlayerRecord } from './repositories';

const MIN_COIN_REWARD = 0;
const MAX_COIN_REWARD = 20;
const BATTLE_WIN_GAME_SCORE_REWARD = 5;
const BATTLE_ATTRIBUTES: readonly BattleAttribute[] = [
  BattleAttribute.strength,
  BattleAttribute.charisma,
  BattleAttribute.endurance,
  BattleAttribute.intelligence,
];

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
    private readonly eventsService: EventsService,
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
    const dayRange = getMoscowDayRange(new Date());
    await this.battleRepository.createDailyBattles(
      opponents.map((opponent) => {
        const [playerOneId, playerTwoId] = this.orderPlayerIds(currentUserId, opponent.id);

        return {
          playerOneId,
          playerTwoId,
          dayStartsAt: dayRange.start,
          featuredAttribute: this.selectRandomFeaturedAttribute(),
        };
      }),
    );
    const dailyBattles = await this.battleRepository.findDailyBattlesForPlayer(
      currentUserId,
      dayRange.start,
    );
    const dailyBattlesByOpponentId = new Map(
      dailyBattles.map((battle) => [
        battle.playerOneId === currentUserId ? battle.playerTwoId : battle.playerOneId,
        battle,
      ]),
    );

    const players = opponents
      .map((opponent) => {
        const dailyBattle = dailyBattlesByOpponentId.get(opponent.id);
        if (!dailyBattle) {
          throw new ConflictException('Daily battle could not be created');
        }

        const opponentStats = this.getFinalStats(opponent);
        const currentUserPower = this.calculatePower(
          currentUserStats,
          dailyBattle.featuredAttribute,
        );
        const opponentPower = this.calculatePower(opponentStats, dailyBattle.featuredAttribute);
        const winProbability = calculateBattleWinProbability(currentUserPower, opponentPower);

        return {
          gameScore: opponent.gameScore,
          userId: opponent.id,
          username: opponent.username,
          avatar: opponent.avatarUrl,
          equipment: this.toBattleEquipment(opponent),
          stats: this.toBattleStatsDto(opponentStats),
          featuredAttribute: dailyBattle.featuredAttribute,
          featuredAttributeMultiplier: FEATURED_ATTRIBUTE_MULTIPLIER,
          winChancePercent: this.toWinChancePercent(winProbability),
          winGameScoreReward: BATTLE_WIN_GAME_SCORE_REWARD,
          winGoldReward: this.calculateCoinReward(winProbability),
          isBattleAvailableToday: dailyBattle.completedAt === null,
        };
      })
      .sort((left, right) => {
        const leftPower = this.calculatePower(left.stats, left.featuredAttribute);
        const rightPower = this.calculatePower(right.stats, right.featuredAttribute);

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
        featuredAttribute: entry.featuredAttribute,
        featuredAttributeMultiplier: entry.featuredAttributeMultiplier,
        winChancePercent: entry.winChancePercent,
        winGameScoreReward: entry.winGameScoreReward,
        winGoldReward: entry.winGoldReward,
        isBattleAvailableToday: entry.isBattleAvailableToday,
      }));

    return {
      players,
    };
  }

  async startBattle(
    currentUserId: string,
    opponentUserId: string,
  ): Promise<StartBattleResponseDto> {
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

      const dayRange = getMoscowDayRange(new Date());
      const [playerOneId, playerTwoId] = this.orderPlayerIds(currentUserId, opponentUserId);
      const dailyBattle = await this.battleRepository.findOrCreateDailyBattle(
        {
          playerOneId,
          playerTwoId,
          dayStartsAt: dayRange.start,
          featuredAttribute: this.selectRandomFeaturedAttribute(),
        },
        tx,
      );

      if (dailyBattle.completedAt) {
        throw new ConflictException('Already battled today');
      }

      const currentUserStats = this.getFinalStats(currentUser);
      const opponentStats = this.getFinalStats(opponentUser);

      const currentUserPower = this.calculatePower(
        currentUserStats,
        dailyBattle.featuredAttribute,
      );
      const opponentPower = this.calculatePower(opponentStats, dailyBattle.featuredAttribute);
      const currentUserWinProbability = calculateBattleWinProbability(
        currentUserPower,
        opponentPower,
      );
      const noisyCurrentUserPower = this.applyPowerNoise(currentUserPower);
      const noisyOpponentPower = this.applyPowerNoise(opponentPower);
      const attackerWinProbability = calculateBattleWinProbability(
        noisyCurrentUserPower,
        noisyOpponentPower,
      );
      const attackerWon = Math.random() < attackerWinProbability;

      const winner = attackerWon ? currentUser : opponentUser;
      const loser = attackerWon ? opponentUser : currentUser;
      const winnerWinProbability = attackerWon
        ? currentUserWinProbability
        : 1 - currentUserWinProbability;
      const coinReward = this.calculateCoinReward(winnerWinProbability);
      const gameScoreReward = BATTLE_WIN_GAME_SCORE_REWARD;

      const completed = await this.battleRepository.completeDailyBattle(
        dailyBattle.id,
        new Date(),
        tx,
      );
      if (!completed) {
        throw new ConflictException('Already battled today');
      }

      await this.battleRepository.applyWinnerBattleRewards(
        winner.id,
        coinReward,
        gameScoreReward,
        tx,
      );

      await this.battleRepository.createBattleLog(
        {
          dailyBattleId: dailyBattle.id,
          attackerUserId: currentUserId,
          defenderUserId: opponentUserId,
          attackerPower: noisyCurrentUserPower,
          defenderPower: noisyOpponentPower,
          attackerWinProbability,
          winnerUserId: winner.id,
          loserUserId: loser.id,
          transferredCoins: coinReward,
          gameScoreReward,
        },
        tx,
      );

      await this.eventsService.createBattleEvent(
        {
          challengerId: currentUserId,
          opponentId: opponentUserId,
          winnerId: winner.id,
          challengerWon: attackerWon,
          gameScoreReward,
          goldReward: coinReward,
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
        transferredCoins: coinReward,
        ...(attackerWon ? { gameScoreReward } : {}),
        updatedCurrentUserBalance: updatedCurrentUser.balance,
        updatedCurrentUserGameScore: updatedCurrentUser.gameScore,
        battleAvailableTomorrow: true,
      };
    });
  }

  private async prismaSerializableTransaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(callback, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  }

  private getFinalStats(player: BattlePlayerRecord): FinalBattleStats {
    const bonusStrength = player.equipment.reduce(
      (sum, slot) => sum + (slot.item?.strength ?? 0),
      0,
    );
    const bonusCharisma = player.equipment.reduce(
      (sum, slot) => sum + (slot.item?.charisma ?? 0),
      0,
    );
    const bonusIntelligence = player.equipment.reduce(
      (sum, slot) => sum + (slot.item?.intelligence ?? 0),
      0,
    );
    const bonusEndurance = player.equipment.reduce(
      (sum, slot) => sum + (slot.item?.agility ?? 0),
      0,
    );

    return {
      strength: player.strength + bonusStrength,
      intelligence: player.intelligence + bonusIntelligence,
      charisma: player.charisma + bonusCharisma,
      endurance: player.endurance + bonusEndurance,
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

  private calculatePower(
    stats: FinalBattleStats,
    featuredAttribute: FeaturedBattleAttribute,
  ): number {
    return calculateBattlesPower(stats, featuredAttribute);
  }

  private applyPowerNoise(power: number): number {
    return power * (0.9 + Math.random() * 0.2);
  }

  private toWinChancePercent(probability: number): number {
    return Number((probability * 100).toFixed(2));
  }

  private calculateCoinReward(winnerWinProbability: number): number {
    const underdogReward = Math.round((1 - winnerWinProbability) * MAX_COIN_REWARD);

    return this.clamp(underdogReward, MIN_COIN_REWARD, MAX_COIN_REWARD);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private orderPlayerIds(firstPlayerId: string, secondPlayerId: string): [string, string] {
    return firstPlayerId < secondPlayerId
      ? [firstPlayerId, secondPlayerId]
      : [secondPlayerId, firstPlayerId];
  }

  private selectRandomFeaturedAttribute(): BattleAttribute {
    const selectedIndex = Math.floor(Math.random() * BATTLE_ATTRIBUTES.length);

    return BATTLE_ATTRIBUTES[selectedIndex] ?? BattleAttribute.strength;
  }

  private toBattleEquipment(player: BattlePlayerRecord): BattlePlayerEquipmentDto {
    return player.equipment.reduce<BattlePlayerEquipmentDto>(
      (accumulator, equipmentSlot) => {
        if (!equipmentSlot.item) {
          return accumulator;
        }

        const equippedItem = {
          id: equipmentSlot.item.id,
          name: equipmentSlot.item.name,
          slot_type: equipmentSlot.item.slotType,
          description: equipmentSlot.item.description,
          image_url: equipmentSlot.item.imageUrl,
          strength: equipmentSlot.item.strength,
          charisma: equipmentSlot.item.charisma,
          agility: equipmentSlot.item.agility,
          intelligence: equipmentSlot.item.intelligence,
          price: equipmentSlot.item.price,
          rarity: equipmentSlot.item.rarity,
          durability: equipmentSlot.item.durability,
          created_at: equipmentSlot.item.createdAt.toISOString(),
        };

        if (equipmentSlot.slotType === EquipmentSlotType.ACCESSORY) {
          accumulator.accessories.push(equippedItem);
          return accumulator;
        }

        const mappedSlot = this.mapEquipmentSlot(equipmentSlot.slotType);
        accumulator[mappedSlot] = equippedItem;

        return accumulator;
      },
      { accessories: [] },
    );
  }

  private mapEquipmentSlot(
    slotType: Exclude<EquipmentSlotType, 'ACCESSORY'>,
  ): Exclude<keyof BattlePlayerEquipmentDto, 'accessories'> {
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
}
