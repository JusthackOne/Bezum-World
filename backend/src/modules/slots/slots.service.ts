import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import {
  type SlotLeaderboardResponseDto,
  type SlotsConfigResponseDto,
  type SpinSlotResponseDto,
} from './dto';
import { SlotsRepository, type SlotLeaderboardUserRecord } from './repositories';
import { SLOT_BET, SLOT_HIT_RATE_BPS, SLOT_PAYTABLE, SLOT_RTP_BPS } from './slots.constants';
import { SlotLeaderboardType } from './types';
import { generateSlotOutcome, getSlotStatisticChange } from './slots.utils';

@Injectable()
export class SlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotsRepository: SlotsRepository,
  ) {}

  getConfig(): SlotsConfigResponseDto {
    return {
      bet: SLOT_BET,
      rtpBps: SLOT_RTP_BPS,
      hitRateBps: SLOT_HIT_RATE_BPS,
      symbols: SLOT_PAYTABLE.map((entry) => ({
        ...entry,
        payout: SLOT_BET * entry.payoutMultiplier,
      })),
    };
  }

  async getLeaderboard(type: SlotLeaderboardType): Promise<SlotLeaderboardResponseDto> {
    const users = await this.slotsRepository.findUsersForLeaderboard();
    const sortedUsers = this.sortLeaderboard(users, type);

    return {
      type,
      leaders: sortedUsers.map((user, index) => ({
        ...user,
        rank: index + 1,
      })),
    };
  }

  async spin(accountId: string): Promise<SpinSlotResponseDto> {
    const outcome = generateSlotOutcome();
    const payout = SLOT_BET * outcome.payoutMultiplier;

    return this.prisma.$transaction(async (tx) => {
      const wasBalanceUpdated = await this.slotsRepository.applySpinBalanceChange(
        accountId,
        SLOT_BET,
        payout,
        tx,
      );

      if (!wasBalanceUpdated) {
        const accountExists = await this.slotsRepository.accountExists(accountId, tx);
        if (!accountExists) {
          throw new UnauthorizedException('Account is not found');
        }

        throw new BadRequestException('Insufficient balance');
      }

      const netChange = payout - SLOT_BET;
      const statisticChange = getSlotStatisticChange(netChange);
      await this.slotsRepository.incrementStatistics(
        accountId,
        statisticChange.winnings,
        statisticChange.losses,
        tx,
      );

      return {
        result: outcome.result,
        bet: SLOT_BET,
        payout,
        netChange,
        isWin: payout > 0,
      };
    });
  }

  private sortLeaderboard(
    users: SlotLeaderboardUserRecord[],
    type: SlotLeaderboardType,
  ): SlotLeaderboardUserRecord[] {
    const scoreKey =
      type === SlotLeaderboardType.losses ? ('totalLosses' as const) : ('totalWinnings' as const);

    return [...users].sort((left, right) => {
      const scoreDifference = right[scoreKey] - left[scoreKey];
      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return left.username.localeCompare(right.username);
    });
  }
}
