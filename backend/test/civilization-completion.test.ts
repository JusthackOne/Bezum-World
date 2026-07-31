import { describe, expect, test } from 'bun:test';
import {
  CivilizationAttributeKey,
  CivilizationCompletionReason,
  CivilizationEventType,
  CivilizationGameStatus,
  CivilizationRewardResourceType,
  CivilizationTeamSide,
  CivilizationTerrainType,
  Prisma,
} from '@prisma/client';

import { CivilizationCompletionService } from '../src/modules/civilization/civilization-completion.service';
import { CivilizationConnectivityService } from '../src/modules/civilization/civilization-connectivity.service';
import { CivilizationRuntimeService } from '../src/modules/civilization/civilization-runtime.service';
import { defaultCivilizationSettings } from '../src/modules/civilization/domain';
import {
  CivilizationRepository,
  type CivilizationEventInput,
  type CivilizationStateRecord,
  type CivilizationTransaction,
} from '../src/modules/civilization/repositories';

const GAME_ID = '00000000-0000-4000-8000-000000000001';
const TEAM_A_ID = '00000000-0000-4000-8000-00000000000a';
const TEAM_B_ID = '00000000-0000-4000-8000-00000000000b';
const COMPLETED_AT = new Date('2026-08-08T00:00:00.000Z');

interface RewardRecord {
  gameId: string;
  teamId: string;
  playerId: string;
  resourceType: CivilizationRewardResourceType;
  attributeKey: CivilizationAttributeKey | null;
  amount: number;
  appliedAt: Date | null;
}

describe('Civilization completion, scoring, and rewards', () => {
  test('scores all four attributes, splits rewards equally, and is idempotent', async () => {
    const state = createCompletionState();
    const rewards: RewardRecord[] = [];
    const accountIncrements: Array<{
      userId: string;
      key: 'balance' | CivilizationAttributeKey;
      amount: number;
    }> = [];
    const events: CivilizationEventInput[] = [];
    let snapshotCount = 0;
    const repository = {
      async findStateById(): Promise<CivilizationStateRecord> {
        return state;
      },
      async updateTeam(teamId: string, data: Record<string, unknown>): Promise<void> {
        const team = state.teams.find((candidate) => candidate.id === teamId);
        if (!team) throw new Error(`Unknown team ${teamId}`);
        team.finalScore = data.finalScore as Prisma.Decimal;
      },
      async updateGame(_gameId: string, data: Record<string, unknown>): Promise<void> {
        state.status = data.status as CivilizationGameStatus;
        state.completionReason = data.completionReason as CivilizationCompletionReason;
        state.completedAt = data.completedAt as Date;
        const winnerTeam = data.winnerTeam as { connect?: { id: string } };
        state.winnerTeamId = winnerTeam.connect?.id ?? null;
      },
      async findRewardDistribution(
        gameId: string,
        playerId: string,
        resourceType: CivilizationRewardResourceType,
        attributeKey: CivilizationAttributeKey | null,
      ): Promise<RewardRecord | null> {
        return (
          rewards.find(
            (reward) =>
              reward.gameId === gameId &&
              reward.playerId === playerId &&
              reward.resourceType === resourceType &&
              reward.attributeKey === attributeKey,
          ) ?? null
        );
      },
      async createRewardDistribution(data: RewardRecord): Promise<void> {
        rewards.push(data);
      },
      async incrementAccountReward(
        userId: string,
        key: 'balance' | CivilizationAttributeKey,
        amount: number,
      ): Promise<void> {
        accountIncrements.push({ userId, key, amount });
      },
      async createEvent(input: CivilizationEventInput): Promise<void> {
        events.push(input);
      },
      async createSnapshot(): Promise<void> {
        snapshotCount += 1;
      },
    };
    const connectivity = {
      async recalculate(): Promise<CivilizationStateRecord> {
        return state;
      },
    };
    const service = new CivilizationCompletionService(
      repository as unknown as CivilizationRepository,
      connectivity as unknown as CivilizationConnectivityService,
      {} as CivilizationRuntimeService,
    );

    await service.completeInTransaction(
      GAME_ID,
      CivilizationCompletionReason.END_TIME_REACHED,
      null,
      COMPLETED_AT,
      {} as CivilizationTransaction,
    );

    expect(state.status).toBe(CivilizationGameStatus.COMPLETED);
    expect(state.winnerTeamId).toBe(TEAM_A_ID);
    expect(state.teams.find((team) => team.id === TEAM_A_ID)?.finalScore?.toString()).toBe('80');
    expect(state.teams.find((team) => team.id === TEAM_B_ID)?.finalScore?.toString()).toBe('20');
    expect(
      rewards
        .filter(
          (reward) =>
            reward.teamId === TEAM_A_ID &&
            reward.resourceType === CivilizationRewardResourceType.GOLD,
        )
        .map((reward) => ({ playerId: reward.playerId, amount: reward.amount })),
    ).toEqual([
      { playerId: 'player-a-1', amount: 3 },
      { playerId: 'player-a-2', amount: 2 },
    ]);
    expect(
      rewards
        .filter(
          (reward) =>
            reward.teamId === TEAM_A_ID &&
            reward.attributeKey === CivilizationAttributeKey.endurance,
        )
        .map((reward) => ({ playerId: reward.playerId, amount: reward.amount })),
    ).toEqual([
      { playerId: 'player-a-1', amount: 2 },
      { playerId: 'player-a-2', amount: 1 },
    ]);
    expect(
      new Set(
        rewards
          .filter((reward) => reward.resourceType === CivilizationRewardResourceType.ATTRIBUTE)
          .map((reward) => reward.attributeKey),
      ),
    ).toEqual(
      new Set([
        CivilizationAttributeKey.strength,
        CivilizationAttributeKey.charisma,
        CivilizationAttributeKey.endurance,
        CivilizationAttributeKey.intelligence,
      ]),
    );
    expect(accountIncrements).toContainEqual({ userId: 'user-a-1', key: 'balance', amount: 3 });
    expect(accountIncrements).toContainEqual({
      userId: 'user-a-1',
      key: CivilizationAttributeKey.endurance,
      amount: 2,
    });
    expect(events.at(-1)).toMatchObject({
      eventType: CivilizationEventType.GAME_COMPLETED,
      payload: {
        reason: CivilizationCompletionReason.END_TIME_REACHED,
        winnerTeamId: TEAM_A_ID,
        scores: { [TEAM_A_ID]: '80', [TEAM_B_ID]: '20' },
      },
    });
    expect(snapshotCount).toBe(1);

    const rewardCount = rewards.length;
    const incrementCount = accountIncrements.length;
    const eventCount = events.length;
    await service.completeInTransaction(
      GAME_ID,
      CivilizationCompletionReason.END_TIME_REACHED,
      null,
      COMPLETED_AT,
      {} as CivilizationTransaction,
    );

    expect(rewards).toHaveLength(rewardCount);
    expect(accountIncrements).toHaveLength(incrementCount);
    expect(events).toHaveLength(eventCount);
    expect(snapshotCount).toBe(1);
  });
});

function createCompletionState(): CivilizationStateRecord {
  const teams = [
    completionTeam(TEAM_A_ID, CivilizationTeamSide.TEAM_A, 'tile-a'),
    completionTeam(TEAM_B_ID, CivilizationTeamSide.TEAM_B, 'tile-b'),
  ];
  const players = [
    completionPlayer('player-a-2', 'user-a-2', TEAM_A_ID, 'tile-a'),
    completionPlayer('player-a-1', 'user-a-1', TEAM_A_ID, 'tile-a'),
    completionPlayer('player-b-1', 'user-b-1', TEAM_B_ID, 'tile-b'),
  ];
  const attributeResources = Object.values(CivilizationAttributeKey).flatMap((attributeKey) => [
    completionAttributeResource(
      `attribute-a-${attributeKey}`,
      TEAM_A_ID,
      attributeKey,
      attributeKey === CivilizationAttributeKey.endurance ? '3' : '0',
    ),
    completionAttributeResource(`attribute-b-${attributeKey}`, TEAM_B_ID, attributeKey, '0'),
  ]);

  return {
    id: GAME_ID,
    name: 'Completion fixture',
    status: CivilizationGameStatus.ACTIVE,
    startAt: new Date('2026-08-01T00:00:00.000Z'),
    endAt: COMPLETED_AT,
    completedAt: null,
    winnerTeamId: null,
    completionReason: null,
    settingsJson: structuredClone(defaultCivilizationSettings),
    createdByAdminId: 'admin-1',
    stateVersion: 0,
    createdAt: new Date('2026-07-20T00:00:00.000Z'),
    updatedAt: COMPLETED_AT,
    teams,
    players,
    tiles: [completionTile('tile-a', 0, TEAM_A_ID), completionTile('tile-b', 1, TEAM_B_ID)],
    spawnPoints: [],
    buildings: [],
    towers: [],
    teamResources: [
      completionGoldResource('gold-a', TEAM_A_ID, '5'),
      completionGoldResource('gold-b', TEAM_B_ID, '20'),
    ],
    attributeResources,
  } as unknown as CivilizationStateRecord;
}

function completionTeam(
  id: string,
  side: CivilizationTeamSide,
  townHallTileId: string,
): CivilizationStateRecord['teams'][number] {
  return {
    id,
    gameId: GAME_ID,
    name: side,
    color: '#000000',
    visualIdentifier: side.toLowerCase(),
    side,
    townHallTileId,
    finalScore: null,
    createdAt: COMPLETED_AT,
  };
}

function completionPlayer(
  id: string,
  userId: string,
  teamId: string,
  tileId: string,
): CivilizationStateRecord['players'][number] {
  return {
    id,
    gameId: GAME_ID,
    teamId,
    userId,
    initialTileId: tileId,
    spawnTileId: tileId,
    currentTileId: tileId,
    actionPointUnits: 0,
    lastActionPointUpdateAt: COMPLETED_AT,
    joinedAt: COMPLETED_AT,
    isActive: true,
    createdAt: COMPLETED_AT,
    updatedAt: COMPLETED_AT,
    user: { id: userId, username: userId, avatarUrl: null },
  };
}

function completionTile(
  id: string,
  q: number,
  ownerTeamId: string,
): CivilizationStateRecord['tiles'][number] {
  return {
    id,
    gameId: GAME_ID,
    q,
    r: 0,
    terrainType: CivilizationTerrainType.GROUND,
    ownerTeamId,
    isConnected: true,
    createdAt: COMPLETED_AT,
    updatedAt: COMPLETED_AT,
  };
}

function completionGoldResource(
  id: string,
  teamId: string,
  amount: string,
): CivilizationStateRecord['teamResources'][number] {
  return {
    id,
    gameId: GAME_ID,
    teamId,
    goldAmount: new Prisma.Decimal(amount),
    goldIncomePerHour: new Prisma.Decimal(0),
    lastSettledAt: COMPLETED_AT,
    createdAt: COMPLETED_AT,
    updatedAt: COMPLETED_AT,
  };
}

function completionAttributeResource(
  id: string,
  teamId: string,
  attributeKey: CivilizationAttributeKey,
  amount: string,
): CivilizationStateRecord['attributeResources'][number] {
  return {
    id,
    gameId: GAME_ID,
    teamId,
    attributeKey,
    amount: new Prisma.Decimal(amount),
    incomePerHour: new Prisma.Decimal(0),
    lastSettledAt: COMPLETED_AT,
    createdAt: COMPLETED_AT,
    updatedAt: COMPLETED_AT,
  };
}
