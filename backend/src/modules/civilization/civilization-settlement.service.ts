import { Injectable } from '@nestjs/common';
import { CivilizationEventType, CivilizationGameStatus } from '@prisma/client';

import { settleActionPoints, settleDecimalResource, type CivilizationSettings } from './domain';
import {
  CivilizationRepository,
  type CivilizationStateRecord,
  type CivilizationTransaction,
} from './repositories';

@Injectable()
export class CivilizationSettlementService {
  constructor(private readonly repository: CivilizationRepository) {}

  async settlePlayer(
    player: CivilizationStateRecord['players'][number],
    settings: CivilizationSettings,
    now: Date,
    tx: CivilizationTransaction,
  ): Promise<{
    actionPointUnits: number;
    lastActionPointUpdateAt: Date;
    nextRegenerationAt: Date | null;
  }> {
    const settlement = settleActionPoints({
      currentUnits: player.actionPointUnits,
      maximumUnits: settings.actionPoints.maximumUnits,
      regenerationUnits: settings.actionPoints.regenerationUnits,
      regenerationIntervalMinutes: settings.actionPoints.regenerationIntervalMinutes,
      lastActionPointUpdateAt: player.lastActionPointUpdateAt,
      now,
    });

    if (
      settlement.actionPointUnits !== player.actionPointUnits ||
      settlement.lastActionPointUpdateAt.getTime() !== player.lastActionPointUpdateAt.getTime()
    ) {
      await this.repository.updatePlayer(
        player.id,
        {
          actionPointUnits: settlement.actionPointUnits,
          lastActionPointUpdateAt: settlement.lastActionPointUpdateAt,
        },
        tx,
      );
    }

    return settlement;
  }

  async settleAllResources(
    state: CivilizationStateRecord,
    now: Date,
    tx: CivilizationTransaction,
  ): Promise<void> {
    if (state.status !== CivilizationGameStatus.ACTIVE) return;
    const settlementTime = new Date(Math.min(now.getTime(), state.endAt.getTime()));

    for (const resource of state.teamResources) {
      if (settlementTime.getTime() < resource.lastSettledAt.getTime()) continue;
      const settlement = settleDecimalResource({
        amount: resource.goldAmount,
        incomePerHour: resource.goldIncomePerHour,
        lastSettledAt: resource.lastSettledAt,
        now: settlementTime,
      });
      await this.repository.updateTeamResource(
        resource.id,
        { goldAmount: settlement.amount, lastSettledAt: settlement.lastSettledAt },
        tx,
      );
      if (settlement.accruedAmount !== '0') {
        await this.repository.createEvent(
          {
            gameId: state.id,
            teamId: resource.teamId,
            eventType: CivilizationEventType.GOLD_ACCRUED,
            payload: {
              previousAmount: settlement.previousAmount,
              accruedAmount: settlement.accruedAmount,
              amount: settlement.amount,
              incomePerHour: settlement.incomePerHour,
              elapsedMilliseconds: settlement.elapsedMilliseconds,
            },
          },
          tx,
        );
      }
    }

    for (const resource of state.attributeResources) {
      if (settlementTime.getTime() < resource.lastSettledAt.getTime()) continue;
      const settlement = settleDecimalResource({
        amount: resource.amount,
        incomePerHour: resource.incomePerHour,
        lastSettledAt: resource.lastSettledAt,
        now: settlementTime,
      });
      await this.repository.updateAttributeResource(
        resource.id,
        { amount: settlement.amount, lastSettledAt: settlement.lastSettledAt },
        tx,
      );
      if (settlement.accruedAmount !== '0') {
        await this.repository.createEvent(
          {
            gameId: state.id,
            teamId: resource.teamId,
            eventType: CivilizationEventType.ATTRIBUTE_ACCRUED,
            payload: {
              attributeKey: resource.attributeKey,
              previousAmount: settlement.previousAmount,
              accruedAmount: settlement.accruedAmount,
              amount: settlement.amount,
              incomePerHour: settlement.incomePerHour,
              elapsedMilliseconds: settlement.elapsedMilliseconds,
            },
          },
          tx,
        );
      }
    }
  }
}
