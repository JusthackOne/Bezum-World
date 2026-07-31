import { describe, expect, test } from 'bun:test';
import { ForbiddenException } from '@nestjs/common';
import {
  CivilizationGameStatus,
  CivilizationTeamSide,
  CivilizationTerrainType,
} from '@prisma/client';

import { CivilizationQueryService } from '../src/modules/civilization/civilization-query.service';
import { CivilizationRuntimeService } from '../src/modules/civilization/civilization-runtime.service';
import { CivilizationSettlementService } from '../src/modules/civilization/civilization-settlement.service';
import { defaultCivilizationSettings } from '../src/modules/civilization/domain';
import {
  CivilizationRepository,
  type CivilizationEventRecord,
  type CivilizationStateRecord,
  type CivilizationTransaction,
} from '../src/modules/civilization/repositories';

const GAME_ID = '00000000-0000-4000-8000-000000000001';
const TEAM_A_ID = '00000000-0000-4000-8000-00000000000a';
const PLAYER_A_ID = '00000000-0000-4000-8000-0000000000a1';
const USER_A_ID = '00000000-0000-4000-8000-0000000001a1';
const FIXED_NOW = new Date('2026-08-09T12:00:00.000Z');

interface QueryHarness {
  service: CivilizationQueryService;
  settlementCalls: string[];
}

function createQueryHarness(state: CivilizationStateRecord): QueryHarness {
  const settlementCalls: string[] = [];
  const repository = {
    transaction<T>(callback: (tx: CivilizationTransaction) => Promise<T>): Promise<T> {
      return callback({} as CivilizationTransaction);
    },
    async lockGameState(): Promise<void> {},
    async findStateById(): Promise<CivilizationStateRecord> {
      return state;
    },
    async listEvents(): Promise<{ items: CivilizationEventRecord[]; total: number }> {
      return {
        items: [
          {
            id: 'event-1',
            gameId: GAME_ID,
            teamId: null,
            actorPlayerId: null,
            actorPlayer: null,
            targetPlayerId: null,
            targetPlayer: null,
            tileId: null,
            eventType: 'GAME_COMPLETED',
            payloadJson: { reason: 'END_TIME_REACHED' },
            createdAt: FIXED_NOW,
          } as CivilizationEventRecord,
        ],
        total: 1,
      };
    },
  };
  const settlement = {
    async settleAllResources(): Promise<void> {
      settlementCalls.push('resources');
    },
    async settlePlayer(): Promise<void> {
      settlementCalls.push('player');
    },
  };
  const runtime = {
    now(): Date {
      return new Date(FIXED_NOW);
    },
  };

  return {
    service: new CivilizationQueryService(
      repository as unknown as CivilizationRepository,
      settlement as unknown as CivilizationSettlementService,
      runtime as unknown as CivilizationRuntimeService,
    ),
    settlementCalls,
  };
}

function createQueryState(status: CivilizationGameStatus): CivilizationStateRecord {
  const completed = status === CivilizationGameStatus.COMPLETED;
  return {
    id: GAME_ID,
    name: 'Civilization history fixture',
    status,
    startAt: new Date('2026-08-01T00:00:00.000Z'),
    endAt: new Date('2026-08-08T00:00:00.000Z'),
    completedAt: completed ? new Date('2026-08-08T00:00:00.000Z') : null,
    winnerTeamId: completed ? TEAM_A_ID : null,
    completionReason: completed ? 'END_TIME_REACHED' : null,
    settingsJson: structuredClone(defaultCivilizationSettings),
    createdByAdminId: 'admin-1',
    stateVersion: 3,
    createdAt: new Date('2026-07-20T00:00:00.000Z'),
    updatedAt: FIXED_NOW,
    teams: [
      {
        id: TEAM_A_ID,
        gameId: GAME_ID,
        name: 'Amber',
        color: '#f59e0b',
        visualIdentifier: 'amber',
        side: CivilizationTeamSide.TEAM_A,
        townHallTileId: 'tile-a',
        finalScore: null,
        createdAt: FIXED_NOW,
      },
    ],
    players: [
      {
        id: PLAYER_A_ID,
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        userId: USER_A_ID,
        initialTileId: 'tile-a',
        spawnTileId: 'tile-a',
        currentTileId: 'tile-a',
        actionPointUnits: 12,
        lastActionPointUpdateAt: new Date('2026-08-08T00:00:00.000Z'),
        joinedAt: new Date('2026-08-01T00:00:00.000Z'),
        isActive: true,
        createdAt: new Date('2026-08-01T00:00:00.000Z'),
        updatedAt: FIXED_NOW,
        user: { id: USER_A_ID, username: 'amber-player', avatarUrl: null },
      },
    ],
    tiles: [
      {
        id: 'tile-a',
        gameId: GAME_ID,
        q: 0,
        r: 0,
        terrainType: CivilizationTerrainType.GROUND,
        ownerTeamId: TEAM_A_ID,
        isConnected: true,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ],
    spawnPoints: [
      { id: 'spawn-a', gameId: GAME_ID, teamId: TEAM_A_ID, tileId: 'tile-a', createdAt: FIXED_NOW },
    ],
    buildings: [],
    towers: [],
    teamResources: [],
    attributeResources: [],
  } as unknown as CivilizationStateRecord;
}

function asResponse(value: unknown): Record<string, unknown> {
  return value as Record<string, unknown>;
}

describe('Civilization query access', () => {
  test('allows a non-participant to inspect completed history in read-only spectator mode', async () => {
    const state = createQueryState(CivilizationGameStatus.COMPLETED);
    const harness = createQueryHarness(state);

    const response = asResponse(await harness.service.getGameState(GAME_ID, 'spectator-user'));

    expect(response.access).toEqual({
      isParticipant: false,
      isSpectator: true,
      isReadOnly: true,
      currentPlayerId: null,
    });
    expect(response.availableActions).toEqual([]);
    expect(harness.settlementCalls).toEqual([]);
  });

  test('keeps completed history read-only even for an assigned participant', async () => {
    const state = createQueryState(CivilizationGameStatus.COMPLETED);
    const harness = createQueryHarness(state);

    const response = asResponse(await harness.service.getGameState(GAME_ID, USER_A_ID));

    expect(response.access).toEqual({
      isParticipant: true,
      isSpectator: false,
      isReadOnly: true,
      currentPlayerId: PLAYER_A_ID,
    });
    expect(response.availableActions).toEqual([]);
  });

  test('allows spectator event history for completed games', async () => {
    const state = createQueryState(CivilizationGameStatus.COMPLETED);
    const harness = createQueryHarness(state);

    const response = asResponse(await harness.service.getEvents(GAME_ID, 'spectator-user', 1, 25));

    expect(response).toMatchObject({
      total: 1,
      page: 1,
      limit: 25,
      items: [
        {
          id: 'event-1',
          type: 'GAME_COMPLETED',
          payload: { reason: 'END_TIME_REACHED' },
        },
      ],
    });
  });

  test('hides draft game state and event history from non-admin query endpoints', async () => {
    const state = createQueryState(CivilizationGameStatus.DRAFT);
    const harness = createQueryHarness(state);

    await expect(harness.service.getGameState(GAME_ID, USER_A_ID)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(harness.service.getEvents(GAME_ID, USER_A_ID, 1, 25)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  test('marks an active participant writable but an active spectator read-only', () => {
    const state = createQueryState(CivilizationGameStatus.ACTIVE);
    const harness = createQueryHarness(state);

    const participant = harness.service.toState(state, USER_A_ID, FIXED_NOW);
    const spectator = harness.service.toState(state, 'spectator-user', FIXED_NOW);

    expect(participant.access).toMatchObject({ isParticipant: true, isReadOnly: false });
    expect(spectator.access).toMatchObject({ isSpectator: true, isReadOnly: true });
    expect(spectator.availableActions).toEqual([]);
  });
});
