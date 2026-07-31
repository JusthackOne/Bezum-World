import { describe, expect, test } from 'bun:test';
import {
  CivilizationCompletionReason,
  CivilizationEventType,
  CivilizationGameStatus,
  CivilizationTerrainType,
  CivilizationTowerStatus,
  CivilizationTowerWorkKind,
} from '@prisma/client';

import { CivilizationCompletionService } from '../src/modules/civilization/civilization-completion.service';
import { CivilizationConnectivityService } from '../src/modules/civilization/civilization-connectivity.service';
import { CivilizationLifecycleService } from '../src/modules/civilization/civilization-lifecycle.service';
import { CivilizationQueryService } from '../src/modules/civilization/civilization-query.service';
import { CivilizationRuntimeService } from '../src/modules/civilization/civilization-runtime.service';
import { CivilizationScheduleService } from '../src/modules/civilization/civilization-schedule.service';
import {
  CivilizationRepository,
  type CivilizationEventInput,
  type CivilizationStateRecord,
  type CivilizationTransaction,
} from '../src/modules/civilization/repositories';

const GAME_ID = '00000000-0000-4000-8000-000000000001';
const TEAM_A_ID = '00000000-0000-4000-8000-00000000000a';
const TILE_ID = '00000000-0000-4000-8000-000000001001';
const TOWER_ID = '00000000-0000-4000-8000-000000002001';
const NOW = new Date('2026-08-01T12:00:00.000Z');

interface LifecycleHarness {
  service: CivilizationLifecycleService;
  state: CivilizationStateRecord;
  events: CivilizationEventInput[];
  completionCalls: Array<{
    gameId: string;
    reason: CivilizationCompletionReason;
  }>;
  towerUpdateCount: number;
}

function createLifecycleHarness(state: CivilizationStateRecord, now = NOW): LifecycleHarness {
  const events: CivilizationEventInput[] = [];
  const completionCalls: LifecycleHarness['completionCalls'] = [];
  let towerUpdateCount = 0;
  const repository = {
    transaction<T>(callback: (tx: CivilizationTransaction) => Promise<T>): Promise<T> {
      return callback({} as CivilizationTransaction);
    },
    async lockGameState(): Promise<void> {},
    async findStateById(): Promise<CivilizationStateRecord> {
      return state;
    },
    async updateTower(towerId: string, data: Record<string, unknown>): Promise<void> {
      towerUpdateCount += 1;
      const index = state.towers.findIndex((tower) => tower.id === towerId);
      const current = state.towers[index];
      if (!current) throw new Error(`Unknown tower ${towerId}`);
      state.towers[index] = { ...current, ...data } as typeof current;
    },
    async createEvent(input: CivilizationEventInput): Promise<void> {
      events.push(input);
    },
    async updateGame(): Promise<void> {},
  };
  const completion = {
    async completeGame(
      gameId: string,
      reason: CivilizationCompletionReason,
    ): Promise<CivilizationStateRecord> {
      completionCalls.push({ gameId, reason });
      state.status = CivilizationGameStatus.COMPLETED;
      return state;
    },
  };
  const runtime = {
    now(): Date {
      return new Date(now);
    },
  };

  const service = new CivilizationLifecycleService(
    repository as unknown as CivilizationRepository,
    {} as CivilizationConnectivityService,
    completion as unknown as CivilizationCompletionService,
    {} as CivilizationQueryService,
    {} as CivilizationScheduleService,
    runtime as unknown as CivilizationRuntimeService,
  );

  return {
    service,
    state,
    events,
    completionCalls,
    get towerUpdateCount(): number {
      return towerUpdateCount;
    },
  };
}

function createLifecycleState(
  towerOwnerTeamId: string | null = TEAM_A_ID,
  completesAt = NOW,
): CivilizationStateRecord {
  return {
    id: GAME_ID,
    status: CivilizationGameStatus.ACTIVE,
    startAt: new Date('2026-08-01T00:00:00.000Z'),
    endAt: new Date('2026-08-08T00:00:00.000Z'),
    tiles: [
      {
        id: TILE_ID,
        gameId: GAME_ID,
        q: 0,
        r: 0,
        terrainType: CivilizationTerrainType.GROUND,
        ownerTeamId: towerOwnerTeamId,
        isConnected: true,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    towers: [
      {
        id: TOWER_ID,
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        tileId: TILE_ID,
        status: CivilizationTowerStatus.UNDER_CONSTRUCTION,
        workKind: CivilizationTowerWorkKind.BUILD,
        protectionRadius: 1,
        constructionStartedAt: new Date('2026-08-01T09:00:00.000Z'),
        constructionCompletesAt: completesAt,
        destroyedAt: null,
        createdByPlayerId: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
  } as CivilizationStateRecord;
}

describe('Civilization tower lifecycle', () => {
  test('activates a completed construction once and records its connectivity', async () => {
    const harness = createLifecycleHarness(createLifecycleState());

    await harness.service.completeTower(GAME_ID, TOWER_ID);
    await harness.service.completeTower(GAME_ID, TOWER_ID);

    expect(harness.state.towers[0]?.status).toBe(CivilizationTowerStatus.ACTIVE);
    expect(harness.towerUpdateCount).toBe(1);
    expect(harness.events).toHaveLength(1);
    expect(harness.events[0]).toMatchObject({
      eventType: CivilizationEventType.TOWER_COMPLETED,
      payload: { towerId: TOWER_ID, connected: true },
    });
  });

  test('cancels construction without refund if the center tile changed owner', async () => {
    const harness = createLifecycleHarness(createLifecycleState(null));

    await harness.service.completeTower(GAME_ID, TOWER_ID);

    expect(harness.state.towers[0]?.status).toBe(CivilizationTowerStatus.CANCELLED);
    expect(harness.events[0]).toMatchObject({
      eventType: CivilizationEventType.TOWER_CONSTRUCTION_CANCELLED,
      payload: {
        towerId: TOWER_ID,
        reason: 'TILE_NOT_OWNED_AT_COMPLETION',
        refund: '0',
      },
    });
  });

  test('completes delayed repair as a repair event', async () => {
    const state = createLifecycleState();
    state.towers[0]!.workKind = CivilizationTowerWorkKind.REPAIR;
    const harness = createLifecycleHarness(state);

    await harness.service.completeTower(GAME_ID, TOWER_ID);

    expect(harness.state.towers[0]).toMatchObject({
      status: CivilizationTowerStatus.ACTIVE,
      workKind: null,
    });
    expect(harness.events[0]).toMatchObject({
      eventType: CivilizationEventType.TOWER_REPAIRED,
      payload: { towerId: TOWER_ID, workKind: CivilizationTowerWorkKind.REPAIR },
    });
  });

  test('does nothing when the deterministic completion time has not arrived', async () => {
    const harness = createLifecycleHarness(
      createLifecycleState(TEAM_A_ID, new Date('2026-08-01T12:00:00.001Z')),
    );

    await harness.service.completeTower(GAME_ID, TOWER_ID);

    expect(harness.state.towers[0]?.status).toBe(CivilizationTowerStatus.UNDER_CONSTRUCTION);
    expect(harness.towerUpdateCount).toBe(0);
    expect(harness.events).toEqual([]);
  });
});

describe('Civilization end-time lifecycle', () => {
  test('completes an active game at its end time and remains idempotent', async () => {
    const state = createLifecycleState();
    state.endAt = NOW;
    const harness = createLifecycleHarness(state);

    await harness.service.completeAtEnd(GAME_ID);
    await harness.service.completeAtEnd(GAME_ID);

    expect(harness.completionCalls).toEqual([
      { gameId: GAME_ID, reason: CivilizationCompletionReason.END_TIME_REACHED },
    ]);
    expect(state.status).toBe(CivilizationGameStatus.COMPLETED);
  });

  test('does not complete an active game before its configured end time', async () => {
    const state = createLifecycleState();
    state.endAt = new Date('2026-08-01T12:00:00.001Z');
    const harness = createLifecycleHarness(state);

    await harness.service.completeAtEnd(GAME_ID);

    expect(harness.completionCalls).toEqual([]);
    expect(state.status).toBe(CivilizationGameStatus.ACTIVE);
  });
});
