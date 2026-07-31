import { Injectable } from '@nestjs/common';
import {
  CivilizationCompletionReason,
  CivilizationEventType,
  CivilizationGameSnapshotType,
  CivilizationGameStatus,
  CivilizationRewardResourceType,
  Prisma,
} from '@prisma/client';

import {
  CIVILIZATION_ATTRIBUTE_KEYS,
  CIVILIZATION_RESOURCE_DECIMAL_SCALE,
  calculateTeamScore,
  formatScaledInteger,
  parseCivilizationSettings,
  settleActionPoints,
  splitIntegerReward,
  toScaledInteger,
} from './domain';
import { CivilizationConnectivityService } from './civilization-connectivity.service';
import { CivilizationRuntimeService } from './civilization-runtime.service';
import { serializeCivilizationSnapshot } from './civilization-snapshot';
import {
  CivilizationRepository,
  type CivilizationStateRecord,
  type CivilizationTransaction,
} from './repositories';

@Injectable()
export class CivilizationCompletionService {
  constructor(
    private readonly repository: CivilizationRepository,
    private readonly connectivityService: CivilizationConnectivityService,
    private readonly runtime: CivilizationRuntimeService,
  ) {}

  completeGame(
    gameId: string,
    reason: CivilizationCompletionReason,
    winnerTeamId: string | null = null,
  ): Promise<CivilizationStateRecord> {
    return this.repository.transaction(async (tx) => {
      await this.repository.lockGameState(gameId, tx);
      return this.completeInTransaction(gameId, reason, winnerTeamId, this.runtime.now(), tx);
    });
  }

  async completeInTransaction(
    gameId: string,
    reason: CivilizationCompletionReason,
    winnerTeamId: string | null,
    now: Date,
    tx: CivilizationTransaction,
  ): Promise<CivilizationStateRecord> {
    let state = await this.repository.findStateById(gameId, tx);
    if (!state) throw new Error(`Civilization game ${gameId} was not found`);
    if (state.status === CivilizationGameStatus.COMPLETED) return state;
    if (state.status === CivilizationGameStatus.CANCELLED) return state;
    const completionAt =
      reason === CivilizationCompletionReason.END_TIME_REACHED ? state.endAt : now;

    state = await this.connectivityService.recalculate(gameId, completionAt, tx);
    const settings = parseCivilizationSettings(state.settingsJson);
    for (const player of state.players) {
      const settlement = settleActionPoints({
        currentUnits: player.actionPointUnits,
        maximumUnits: settings.actionPoints.maximumUnits,
        regenerationUnits: settings.actionPoints.regenerationUnits,
        regenerationIntervalMinutes: settings.actionPoints.regenerationIntervalMinutes,
        lastActionPointUpdateAt: player.lastActionPointUpdateAt,
        now:
          completionAt.getTime() < player.lastActionPointUpdateAt.getTime()
            ? player.lastActionPointUpdateAt
            : completionAt,
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
    }
    state = (await this.repository.findStateById(gameId, tx))!;
    const scores = new Map<string, Prisma.Decimal>();

    for (const team of state.teams) {
      const gold =
        state.teamResources.find((resource) => resource.teamId === team.id)?.goldAmount ?? 0;
      const attributes = new Map(
        state.attributeResources
          .filter((resource) => resource.teamId === team.id)
          .map((resource) => [resource.attributeKey, resource.amount]),
      );
      const score = new Prisma.Decimal(
        formatScaledInteger(
          toScaledInteger(
            calculateTeamScore(
              {
                gold,
                attributes: {
                  strength: attributes.get('strength') ?? '0',
                  charisma: attributes.get('charisma') ?? '0',
                  endurance: attributes.get('endurance') ?? '0',
                  intelligence: attributes.get('intelligence') ?? '0',
                },
              },
              settings.scoreWeights,
            ),
            CIVILIZATION_RESOURCE_DECIMAL_SCALE,
          ),
          CIVILIZATION_RESOURCE_DECIMAL_SCALE,
        ),
      );
      scores.set(team.id, score);
      await this.repository.updateTeam(team.id, { finalScore: score }, tx);
    }

    if (reason !== CivilizationCompletionReason.TOWN_HALL_CAPTURED && !winnerTeamId) {
      const ordered = [...state.teams].sort((left, right) => left.id.localeCompare(right.id));
      const first = ordered[0];
      const second = ordered[1];
      if (first && second) {
        const comparison = (scores.get(first.id) ?? new Prisma.Decimal(0)).cmp(
          scores.get(second.id) ?? new Prisma.Decimal(0),
        );
        winnerTeamId = comparison === 0 ? null : comparison > 0 ? first.id : second.id;
      }
    }

    await this.repository.updateGame(
      gameId,
      {
        status: CivilizationGameStatus.COMPLETED,
        completionReason: reason,
        completedAt: completionAt,
        winnerTeam: winnerTeamId ? { connect: { id: winnerTeamId } } : { disconnect: true },
        stateVersion: { increment: 1 },
      },
      tx,
    );

    state = (await this.repository.findStateById(gameId, tx))!;
    await this.distributeRewards(state, completionAt, tx);
    state = (await this.repository.findStateById(gameId, tx))!;

    await this.repository.createEvent(
      {
        gameId,
        teamId: winnerTeamId,
        eventType: CivilizationEventType.GAME_COMPLETED,
        payload: {
          reason,
          winnerTeamId,
          completedAt: completionAt.toISOString(),
          scores: Object.fromEntries(
            [...scores].map(([teamId, score]) => [teamId, score.toString()]),
          ),
        },
      },
      tx,
    );
    await this.repository.createSnapshot(
      gameId,
      CivilizationGameSnapshotType.FINAL,
      serializeCivilizationSnapshot(state),
      tx,
    );
    return state;
  }

  private async distributeRewards(
    state: CivilizationStateRecord,
    now: Date,
    tx: CivilizationTransaction,
  ): Promise<void> {
    for (const team of state.teams) {
      const players = state.players.filter((player) => player.teamId === team.id);
      if (players.length === 0) continue;
      const playerIds = players.map((player) => player.id);
      const playerById = new Map(players.map((player) => [player.id, player]));
      const goldReward = this.rewardAmount(
        state.teamResources.find((resource) => resource.teamId === team.id)?.goldAmount ?? 0,
      );
      await this.distributeOneResource(
        state.id,
        team.id,
        playerIds,
        playerById,
        CivilizationRewardResourceType.GOLD,
        null,
        goldReward,
        now,
        tx,
      );

      const attributeRewards: Record<string, { amount: number; discardedFraction: string }> = {};
      for (const attributeKey of CIVILIZATION_ATTRIBUTE_KEYS) {
        const reward = this.rewardAmount(
          state.attributeResources.find(
            (resource) => resource.teamId === team.id && resource.attributeKey === attributeKey,
          )?.amount ?? 0,
        );
        attributeRewards[attributeKey] = {
          amount: reward.distributableAmount,
          discardedFraction: reward.discardedFraction,
        };
        await this.distributeOneResource(
          state.id,
          team.id,
          playerIds,
          playerById,
          CivilizationRewardResourceType.ATTRIBUTE,
          attributeKey,
          reward,
          now,
          tx,
        );
      }

      await this.repository.createEvent(
        {
          gameId: state.id,
          teamId: team.id,
          eventType: CivilizationEventType.REWARDS_DISTRIBUTED,
          payload: {
            playerCount: players.length,
            goldAmount: goldReward.distributableAmount,
            discardedGoldFraction: goldReward.discardedFraction,
            attributeRewards,
          },
        },
        tx,
      );
    }
  }

  private async distributeOneResource(
    gameId: string,
    teamId: string,
    playerIds: string[],
    playerById: Map<string, CivilizationStateRecord['players'][number]>,
    resourceType: CivilizationRewardResourceType,
    attributeKey: (typeof CIVILIZATION_ATTRIBUTE_KEYS)[number] | null,
    reward: {
      sourceAmount: string;
      distributableAmount: number;
      discardedFraction: string;
    },
    now: Date,
    tx: CivilizationTransaction,
  ): Promise<void> {
    const split = splitIntegerReward(reward.distributableAmount, playerIds);
    for (const share of split.shares) {
      const existing = await this.repository.findRewardDistribution(
        gameId,
        share.playerId,
        resourceType,
        attributeKey,
        tx,
      );
      if (existing?.appliedAt) continue;
      const player = playerById.get(share.playerId)!;
      await this.repository.createRewardDistribution(
        {
          gameId,
          teamId,
          playerId: share.playerId,
          resourceType,
          attributeKey,
          amount: share.amount,
          appliedAt: now,
          roundingDetails: {
            sourceAmount: reward.sourceAmount,
            discardedFraction: reward.discardedFraction,
            totalAmount: split.totalAmount,
            playerCount: split.playerCount,
            baseShare: split.baseShare,
            remainder: split.remainder,
            stableOrderIndex: share.stableOrderIndex,
            receivedRemainderUnit: share.receivedRemainderUnit,
          },
        },
        tx,
      );
      if (share.amount > 0) {
        await this.repository.incrementAccountReward(
          player.userId,
          attributeKey ?? 'balance',
          share.amount,
          tx,
        );
      }
    }
  }

  private rewardAmount(value: Prisma.Decimal | number): {
    sourceAmount: string;
    distributableAmount: number;
    discardedFraction: string;
  } {
    const source = new Prisma.Decimal(value);
    const floor = source.floor();
    const amount = floor.toNumber();
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new RangeError('Civilization reward amount is outside the supported integer range');
    }
    return {
      sourceAmount: source.toString(),
      distributableAmount: amount,
      discardedFraction: source.sub(floor).toString(),
    };
  }
}
