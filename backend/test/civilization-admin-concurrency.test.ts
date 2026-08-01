import { describe, expect, test } from 'bun:test';
import {
  CivilizationAdminActionType,
  CivilizationCompletionReason,
  CivilizationEventType,
  CivilizationGameStatus,
  CivilizationTeamSide,
  CivilizationTerrainType,
} from '@prisma/client';

import { PrismaService } from '../src/database/prisma/prisma.service';
import { CivilizationAdminService } from '../src/modules/civilization/civilization-admin.service';
import { CivilizationCompletionService } from '../src/modules/civilization/civilization-completion.service';
import { CivilizationConfigurationService } from '../src/modules/civilization/civilization-configuration.service';
import {
  CIVILIZATION_ERROR_CODES,
  CivilizationException,
  type CivilizationErrorCode,
} from '../src/modules/civilization/civilization.errors';
import { CivilizationQueryService } from '../src/modules/civilization/civilization-query.service';
import { CivilizationRuntimeService } from '../src/modules/civilization/civilization-runtime.service';
import { CivilizationScheduleService } from '../src/modules/civilization/civilization-schedule.service';
import { CivilizationSettlementService } from '../src/modules/civilization/civilization-settlement.service';
import { defaultCivilizationSettings } from '../src/modules/civilization/domain';
import {
  CivilizationRepository,
  type CivilizationEventInput,
  type CivilizationStateRecord,
  type CivilizationTransaction,
} from '../src/modules/civilization/repositories';

const GAME_ID = '00000000-0000-4000-8000-000000000101';
const TEAM_A_ID = '00000000-0000-4000-8000-00000000010a';
const TEAM_B_ID = '00000000-0000-4000-8000-00000000010b';
const TILE_A_ID = '00000000-0000-4000-8000-000000001101';
const TILE_B_ID = '00000000-0000-4000-8000-000000001102';
const ADMIN_ID = '00000000-0000-4000-8000-0000000001ad';
const IDEMPOTENCY_KEY = '00000000-0000-4000-8000-0000000011d0';
const NOW = new Date('2026-08-01T12:00:00.000Z');

interface StoredAudit {
  gameId: string;
  adminId: string;
  action: CivilizationAdminActionType;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
}

class InMemoryAdminRepository {
  readonly audits: StoredAudit[] = [];
  readonly events: CivilizationEventInput[] = [];
  readonly operationOrder: string[] = [];
  readonly gameUpdates: Array<Record<string, unknown>> = [];
  dateOverlap = false;
  private nextTransactionError: unknown;
  private transactionTail: Promise<void> = Promise.resolve();

  constructor(readonly state: CivilizationStateRecord) {}

  transaction<T>(callback: (tx: CivilizationTransaction) => Promise<T>): Promise<T> {
    const result = this.transactionTail.then(async () => {
      if (this.nextTransactionError !== undefined) {
        const error = this.nextTransactionError;
        this.nextTransactionError = undefined;
        throw error;
      }
      return callback({} as CivilizationTransaction);
    });
    this.transactionTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  failNextTransactionWith(error: unknown): void {
    this.nextTransactionError = error;
  }

  async lockGameState(): Promise<void> {
    this.operationOrder.push('game-lock');
  }

  async acquireScheduleLock(): Promise<void> {
    this.operationOrder.push('schedule-lock');
  }

  async acquireAdminMutationLock(): Promise<void> {
    this.operationOrder.push('admin-idempotency-lock');
  }

  async findAdminMutation(
    adminId: string,
    action: CivilizationAdminActionType,
    idempotencyKey: string,
  ): Promise<StoredAudit | null> {
    return (
      this.audits.find((audit) => {
        const metadata = audit.metadata;
        return (
          audit.adminId === adminId &&
          audit.action === action &&
          typeof metadata === 'object' &&
          metadata !== null &&
          'idempotencyKey' in metadata &&
          metadata.idempotencyKey === idempotencyKey
        );
      }) ?? null
    );
  }

  async createAudit(input: StoredAudit): Promise<StoredAudit> {
    this.audits.push(input);
    return input;
  }

  async findStateById(): Promise<CivilizationStateRecord> {
    return this.state;
  }

  async hasDateOverlap(): Promise<boolean> {
    this.operationOrder.push('overlap-check');
    return this.dateOverlap;
  }

  async updateGame(_gameId: string, data: Record<string, unknown>): Promise<void> {
    this.gameUpdates.push(data);
    if (typeof data.status === 'string') {
      this.state.status = data.status as CivilizationGameStatus;
    }
    const stateVersion = data.stateVersion;
    if (
      typeof stateVersion === 'object' &&
      stateVersion !== null &&
      'increment' in stateVersion &&
      typeof stateVersion.increment === 'number'
    ) {
      this.state.stateVersion += stateVersion.increment;
    }
  }

  async createEvent(input: CivilizationEventInput): Promise<void> {
    this.events.push(input);
  }
}

interface AdminHarness {
  service: CivilizationAdminService;
  repository: InMemoryAdminRepository;
  state: CivilizationStateRecord;
  completionCalls: Array<{
    gameId: string;
    reason: CivilizationCompletionReason;
    winnerTeamId: string | null;
  }>;
  gameScheduleAttempts: Array<{ gameId: string; startAt: Date; endAt: Date }>;
  successfulGameSchedules: Array<{ gameId: string; startAt: Date; endAt: Date }>;
  failNextGameSchedules(count?: number): void;
}

function createAdminHarness(
  status: CivilizationGameStatus = CivilizationGameStatus.DRAFT,
): AdminHarness {
  const state = createAdminState(status);
  const repository = new InMemoryAdminRepository(state);
  const completionCalls: AdminHarness['completionCalls'] = [];
  const gameScheduleAttempts: AdminHarness['gameScheduleAttempts'] = [];
  const successfulGameSchedules: AdminHarness['successfulGameSchedules'] = [];
  let scheduleFailuresRemaining = 0;

  const configurationService = {
    validate(): { valid: true; issues: [] } {
      return { valid: true, issues: [] };
    },
  };
  const completionService = {
    async completeInTransaction(
      gameId: string,
      reason: CivilizationCompletionReason,
      winnerTeamId: string | null,
    ): Promise<CivilizationStateRecord> {
      completionCalls.push({ gameId, reason, winnerTeamId });
      state.status = CivilizationGameStatus.COMPLETED;
      state.completionReason = reason;
      state.winnerTeamId = winnerTeamId;
      state.completedAt = NOW;
      return state;
    },
  };
  const queryService = {
    toState(current: CivilizationStateRecord): Record<string, unknown> {
      return { id: current.id, status: current.status, stateVersion: current.stateVersion };
    },
  };
  const scheduleService = {
    async scheduleGame(gameId: string, startAt: Date, endAt: Date): Promise<void> {
      const attempt = { gameId, startAt, endAt };
      gameScheduleAttempts.push(attempt);
      if (scheduleFailuresRemaining > 0) {
        scheduleFailuresRemaining -= 1;
        throw new Error('Simulated scheduler outage');
      }
      successfulGameSchedules.push(attempt);
    },
    async scheduleTower(): Promise<void> {},
  };
  const runtime = {
    now(): Date {
      return new Date(NOW);
    },
  };

  const service = new CivilizationAdminService(
    repository as unknown as CivilizationRepository,
    configurationService as unknown as CivilizationConfigurationService,
    { settleAllResources: async (): Promise<void> => {} } as CivilizationSettlementService,
    completionService as unknown as CivilizationCompletionService,
    queryService as unknown as CivilizationQueryService,
    scheduleService as unknown as CivilizationScheduleService,
    runtime as unknown as CivilizationRuntimeService,
  );

  return {
    service,
    repository,
    state,
    completionCalls,
    gameScheduleAttempts,
    successfulGameSchedules,
    failNextGameSchedules(count = 1): void {
      scheduleFailuresRemaining = count;
    },
  };
}

function createAdminState(status: CivilizationGameStatus): CivilizationStateRecord {
  const createdAt = new Date('2026-07-01T00:00:00.000Z');
  return {
    id: GAME_ID,
    name: 'Concurrency fixture',
    status,
    startAt: new Date('2026-08-02T12:00:00.000Z'),
    endAt: new Date('2026-08-09T12:00:00.000Z'),
    completedAt: null,
    winnerTeamId: null,
    completionReason: null,
    settingsJson: structuredClone(defaultCivilizationSettings),
    createdByAdminId: ADMIN_ID,
    stateVersion: 0,
    createdAt,
    updatedAt: createdAt,
    teams: [
      {
        id: TEAM_A_ID,
        gameId: GAME_ID,
        name: 'Amber',
        color: '#f59e0b',
        visualIdentifier: 'amber',
        side: CivilizationTeamSide.TEAM_A,
        townHallTileId: TILE_A_ID,
        finalScore: null,
        createdAt,
      },
      {
        id: TEAM_B_ID,
        gameId: GAME_ID,
        name: 'Azure',
        color: '#0284c7',
        visualIdentifier: 'azure',
        side: CivilizationTeamSide.TEAM_B,
        townHallTileId: TILE_B_ID,
        finalScore: null,
        createdAt,
      },
    ],
    players: [],
    tiles: [
      {
        id: TILE_A_ID,
        gameId: GAME_ID,
        q: 0,
        r: 0,
        terrainType: CivilizationTerrainType.GROUND,
        ownerTeamId: TEAM_A_ID,
        isConnected: true,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: TILE_B_ID,
        gameId: GAME_ID,
        q: 3,
        r: 0,
        terrainType: CivilizationTerrainType.GROUND,
        ownerTeamId: TEAM_B_ID,
        isConnected: true,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    spawnPoints: [
      {
        id: 'spawn-team-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        tileId: TILE_A_ID,
        createdAt,
      },
      {
        id: 'spawn-team-b',
        gameId: GAME_ID,
        teamId: TEAM_B_ID,
        tileId: TILE_B_ID,
        createdAt,
      },
    ],
    buildings: [],
    towers: [],
    teamResources: [],
    attributeResources: [],
    rewardClaims: [],
    events: [],
  } as CivilizationStateRecord;
}

async function expectCivilizationError(
  promise: Promise<unknown>,
  code: CivilizationErrorCode,
): Promise<void> {
  try {
    await promise;
    throw new Error(`Expected Civilization error ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(CivilizationException);
    expect((error as CivilizationException).getResponse()).toMatchObject({ code });
  }
}

describe('Civilization admin idempotency', () => {
  test('serializes concurrent same-key force completion and rejects key reuse with another winner', async () => {
    const harness = createAdminHarness(CivilizationGameStatus.ACTIVE);

    const [first, replay] = await Promise.all([
      harness.service.forceCompleteGame(GAME_ID, ADMIN_ID, IDEMPOTENCY_KEY, TEAM_A_ID),
      harness.service.forceCompleteGame(GAME_ID, ADMIN_ID, IDEMPOTENCY_KEY, TEAM_A_ID),
    ]);

    expect(replay).toEqual(first);
    expect(harness.completionCalls).toEqual([
      {
        gameId: GAME_ID,
        reason: CivilizationCompletionReason.ADMIN_FORCE_COMPLETED,
        winnerTeamId: TEAM_A_ID,
      },
    ]);
    expect(harness.repository.audits).toHaveLength(1);

    await expectCivilizationError(
      harness.service.forceCompleteGame(GAME_ID, ADMIN_ID, IDEMPOTENCY_KEY, TEAM_B_ID),
      CIVILIZATION_ERROR_CODES.ACTION_ALREADY_PROCESSED,
    );
    expect(harness.completionCalls).toHaveLength(1);
  });

  test('replays scheduling after a post-commit queue failure without duplicating the mutation', async () => {
    const harness = createAdminHarness();
    harness.failNextGameSchedules();

    await expect(harness.service.scheduleGame(GAME_ID, ADMIN_ID, IDEMPOTENCY_KEY)).rejects.toThrow(
      'Simulated scheduler outage',
    );
    const retry = await harness.service.scheduleGame(GAME_ID, ADMIN_ID, IDEMPOTENCY_KEY);

    expect(retry).toMatchObject({ id: GAME_ID, status: CivilizationGameStatus.SCHEDULED });
    expect(harness.state.status).toBe(CivilizationGameStatus.SCHEDULED);
    expect(harness.repository.gameUpdates).toHaveLength(1);
    expect(
      harness.repository.events.filter(
        (event) => event.eventType === CivilizationEventType.GAME_SCHEDULED,
      ),
    ).toHaveLength(1);
    expect(harness.repository.audits).toHaveLength(1);
    expect(harness.gameScheduleAttempts).toHaveLength(2);
    expect(harness.successfulGameSchedules).toHaveLength(1);
  });
});

describe('Civilization schedule exclusion handling', () => {
  test('takes the global schedule lock before checking for overlap', async () => {
    const harness = createAdminHarness();
    harness.repository.dateOverlap = true;

    await expectCivilizationError(
      harness.service.scheduleGame(GAME_ID, ADMIN_ID, IDEMPOTENCY_KEY),
      CIVILIZATION_ERROR_CODES.GAME_DATE_OVERLAP,
    );

    expect(harness.repository.operationOrder).toEqual([
      'game-lock',
      'admin-idempotency-lock',
      'schedule-lock',
      'overlap-check',
    ]);
    expect(harness.repository.gameUpdates).toHaveLength(0);
    expect(harness.gameScheduleAttempts).toHaveLength(0);
  });

  test('maps a nested PostgreSQL exclusion-constraint error to the domain overlap code', async () => {
    const harness = createAdminHarness();
    harness.repository.failNextTransactionWith({
      code: 'P2010',
      meta: {
        driverAdapterError: {
          cause: {
            message:
              'conflicting key value violates exclusion constraint "civilization_games_non_overlapping_periods_excl"',
          },
        },
      },
    });

    await expectCivilizationError(
      harness.service.scheduleGame(GAME_ID, ADMIN_ID, IDEMPOTENCY_KEY),
      CIVILIZATION_ERROR_CODES.GAME_DATE_OVERLAP,
    );
  });
});

describe('Civilization repository concurrency primitives', () => {
  test('uses Serializable transactions and stable advisory-lock namespaces', async () => {
    let transactionOptions: unknown;
    const prisma = {
      async $transaction<T>(
        callback: (tx: CivilizationTransaction) => Promise<T>,
        options: unknown,
      ): Promise<T> {
        transactionOptions = options;
        return callback({} as CivilizationTransaction);
      },
    } as unknown as PrismaService;
    const repository = new CivilizationRepository(prisma);

    await repository.transaction(async () => 'completed');
    expect(transactionOptions).toEqual({
      isolationLevel: 'Serializable',
      maxWait: 10_000,
      timeout: 30_000,
    });

    const rawCalls: Array<{ sql: string; values: unknown[] }> = [];
    const tx = {
      async $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number> {
        rawCalls.push({ sql: strings.join('?'), values });
        return 1;
      },
    } as unknown as CivilizationTransaction;

    await repository.acquireGameLock(GAME_ID, tx);
    await repository.acquireScheduleLock(tx);
    await repository.acquireAdminMutationLock(
      ADMIN_ID,
      CivilizationAdminActionType.GAME_CREATED,
      IDEMPOTENCY_KEY,
      tx,
    );

    expect(rawCalls).toHaveLength(3);
    expect(rawCalls[0]?.sql).toContain('pg_advisory_xact_lock');
    expect(rawCalls[0]?.values).toEqual([`civilization:${GAME_ID}`]);
    expect(rawCalls[1]?.sql).toContain("hashtext('civilization:schedule')");
    expect(rawCalls[1]?.values).toEqual([]);
    expect(rawCalls[2]?.sql).toContain('pg_advisory_xact_lock');
    expect(rawCalls[2]?.values).toEqual([
      `civilization-admin:${ADMIN_ID}:${CivilizationAdminActionType.GAME_CREATED}:${IDEMPOTENCY_KEY}`,
    ]);
  });
});
