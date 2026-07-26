import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { type SlotsConfigResponseDto, type SpinSlotResponseDto } from './dto';
import { SlotsRepository } from './repositories';
import { SLOT_BET, SLOT_HIT_RATE_BPS, SLOT_PAYTABLE, SLOT_RTP_BPS } from './slots.constants';
import { generateSlotOutcome } from './slots.utils';

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

      return {
        result: outcome.result,
        bet: SLOT_BET,
        payout,
        netChange: payout - SLOT_BET,
        isWin: payout > 0,
      };
    });
  }
}
