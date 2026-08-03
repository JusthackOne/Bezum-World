import { describe, expect, test } from 'bun:test';
import { ValidationPipe } from '@nestjs/common';
import {
  CivilizationBuildingStatus,
  CivilizationBuildingType,
  CivilizationCompletionReason,
  CivilizationEventType,
  CivilizationGameStatus,
  CivilizationTeamSide,
  CivilizationTerrainType,
  CivilizationTowerStatus,
  CivilizationTowerWorkKind,
  Prisma,
} from '@prisma/client';

import { CivilizationActionsService } from '../src/modules/civilization/civilization-actions.service';
import { CivilizationCompletionService } from '../src/modules/civilization/civilization-completion.service';
import { CivilizationConnectivityService } from '../src/modules/civilization/civilization-connectivity.service';
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
  CivilizationCatapultActionDto,
  CivilizationRepairActionDto,
} from '../src/modules/civilization/dto';
import {
  CivilizationRepository,
  type CivilizationEventInput,
  type CivilizationEventRecord,
  type CivilizationStateRecord,
  type CivilizationTransaction,
} from '../src/modules/civilization/repositories';

const GAME_ID = '00000000-0000-4000-8000-000000000001';
const TEAM_A_ID = '00000000-0000-4000-8000-00000000000a';
const TEAM_B_ID = '00000000-0000-4000-8000-00000000000b';
const PLAYER_A_ID = '00000000-0000-4000-8000-0000000000a1';
const PLAYER_A_TWO_ID = '00000000-0000-4000-8000-0000000000a2';
const PLAYER_B_ID = '00000000-0000-4000-8000-0000000000b1';
const PLAYER_B_TWO_ID = '00000000-0000-4000-8000-0000000000b2';
const USER_A_ID = '00000000-0000-4000-8000-0000000001a1';
const USER_A_TWO_ID = '00000000-0000-4000-8000-0000000001a2';
const USER_B_ID = '00000000-0000-4000-8000-0000000001b1';
const USER_B_TWO_ID = '00000000-0000-4000-8000-0000000001b2';
const ORIGIN_TILE_ID = '00000000-0000-4000-8000-000000001001';
const TARGET_TILE_ID = '00000000-0000-4000-8000-000000001002';
const TEAM_A_SPAWN_TILE_ID = '00000000-0000-4000-8000-00000000100a';
const TEAM_B_SPAWN_TILE_ID = '00000000-0000-4000-8000-00000000100b';
const TEAM_B_APPROACH_TILE_ID = '00000000-0000-4000-8000-00000000100c';
const TEAM_A_REMOTE_TILE_ID = '00000000-0000-4000-8000-00000000100d';
const TEAM_A_BUILD_TILE_ID = '00000000-0000-4000-8000-00000000100e';
const FIXED_NOW = new Date('2026-08-01T12:00:00.000Z');

type StatePlayer = CivilizationStateRecord['players'][number];
type StateTile = CivilizationStateRecord['tiles'][number];
type StateBuilding = CivilizationStateRecord['buildings'][number];
type StateTower = CivilizationStateRecord['towers'][number];

interface StoredAction {
  gameId: string;
  playerId: string;
  idempotencyKey: string;
  requestPayload: unknown;
  resultPayload: unknown;
}

class InMemoryCivilizationRepository {
  readonly actions = new Map<string, StoredAction>();
  readonly events: CivilizationEventRecord[] = [];
  readonly updatePlayerCalls: Array<{ playerId: string; data: Record<string, unknown> }> = [];
  readonly updateTileCalls: Array<{ tileId: string; data: Record<string, unknown> }> = [];
  readonly updateBuildingCalls: Array<{ buildingId: string; data: Record<string, unknown> }> = [];
  readonly updateTowerCalls: Array<{ towerId: string; data: Record<string, unknown> }> = [];
  readonly deleteTowerCalls: string[] = [];
  readonly updateTeamResourceCalls: Array<{
    resourceId: string;
    data: Record<string, unknown>;
  }> = [];
  lockCount = 0;
  private transactionTail: Promise<void> = Promise.resolve();
  private eventSequence = 0;
  private towerSequence = 0;

  constructor(readonly state: CivilizationStateRecord) {}

  transaction<T>(callback: (tx: CivilizationTransaction) => Promise<T>): Promise<T> {
    const result = this.transactionTail.then(() => callback({} as CivilizationTransaction));
    this.transactionTail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async lockGameState(): Promise<void> {
    this.lockCount += 1;
  }

  async findStateById(): Promise<CivilizationStateRecord> {
    return this.state;
  }

  async findAction(
    gameId: string,
    playerId: string,
    idempotencyKey: string,
  ): Promise<StoredAction | null> {
    return this.actions.get(this.actionKey(gameId, playerId, idempotencyKey)) ?? null;
  }

  async createAction(input: StoredAction): Promise<StoredAction> {
    this.actions.set(this.actionKey(input.gameId, input.playerId, input.idempotencyKey), input);
    return input;
  }

  async updateGame(_gameId: string, data: Record<string, unknown>): Promise<void> {
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

  async updatePlayer(playerId: string, data: Record<string, unknown>): Promise<void> {
    this.updatePlayerCalls.push({ playerId, data });
    const index = this.state.players.findIndex((candidate) => candidate.id === playerId);
    const current = this.state.players[index];
    if (!current) throw new Error(`Unknown player ${playerId}`);
    this.state.players[index] = { ...current, ...data } as StatePlayer;
  }

  async updateTile(tileId: string, data: Record<string, unknown>): Promise<void> {
    this.updateTileCalls.push({ tileId, data });
    const index = this.state.tiles.findIndex((candidate) => candidate.id === tileId);
    const current = this.state.tiles[index];
    if (!current) throw new Error(`Unknown tile ${tileId}`);
    this.state.tiles[index] = { ...current, ...data } as StateTile;
  }

  async updateBuilding(buildingId: string, data: Record<string, unknown>): Promise<void> {
    this.updateBuildingCalls.push({ buildingId, data });
    const index = this.state.buildings.findIndex((candidate) => candidate.id === buildingId);
    const current = this.state.buildings[index];
    if (!current) throw new Error(`Unknown building ${buildingId}`);
    this.state.buildings[index] = { ...current, ...data } as StateBuilding;
  }

  async updateTower(towerId: string, data: Record<string, unknown>): Promise<void> {
    this.updateTowerCalls.push({ towerId, data });
    const index = this.state.towers.findIndex((candidate) => candidate.id === towerId);
    const current = this.state.towers[index];
    if (!current) throw new Error(`Unknown tower ${towerId}`);
    this.state.towers[index] = { ...current, ...data } as StateTower;
  }

  async createTower(data: Record<string, unknown>): Promise<StateTower> {
    this.towerSequence += 1;
    const tower = {
      id: `tower-created-${this.towerSequence}`,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
      destroyedAt: null,
      destructionProgressActions: 0,
      destructionRequiredActions: 3,
      ...data,
    } as unknown as StateTower;
    this.state.towers.push(tower);
    return tower;
  }

  async deleteTower(towerId: string): Promise<void> {
    this.deleteTowerCalls.push(towerId);
    const index = this.state.towers.findIndex((candidate) => candidate.id === towerId);
    if (index >= 0) this.state.towers.splice(index, 1);
  }

  async updateTeamResource(resourceId: string, data: Record<string, unknown>): Promise<void> {
    this.updateTeamResourceCalls.push({ resourceId, data });
    const index = this.state.teamResources.findIndex((candidate) => candidate.id === resourceId);
    const current = this.state.teamResources[index];
    if (!current) throw new Error(`Unknown team resource ${resourceId}`);
    this.state.teamResources[index] = { ...current, ...data } as typeof current;
  }

  async createEvent(input: CivilizationEventInput): Promise<CivilizationEventRecord> {
    this.eventSequence += 1;
    const event = {
      id: `event-${this.eventSequence}`,
      gameId: input.gameId,
      teamId: input.teamId ?? null,
      actorPlayerId: input.actorPlayerId ?? null,
      targetPlayerId: input.targetPlayerId ?? null,
      tileId: input.tileId ?? null,
      eventType: input.eventType,
      payloadJson: input.payload,
      createdAt: FIXED_NOW,
      actorPlayer: null,
      targetPlayer: null,
    } as unknown as CivilizationEventRecord;
    this.events.push(event);
    return event;
  }

  private actionKey(gameId: string, playerId: string, idempotencyKey: string): string {
    return `${gameId}:${playerId}:${idempotencyKey}`;
  }
}

interface ActionHarness {
  service: CivilizationActionsService;
  repository: InMemoryCivilizationRepository;
  state: CivilizationStateRecord;
  completionCalls: Array<{
    gameId: string;
    reason: CivilizationCompletionReason;
    winnerTeamId: string | null;
  }>;
  scheduledTowers: Array<{ towerId: string; gameId: string; completesAt: Date }>;
  towerScheduleAttempts: Array<{ towerId: string; gameId: string; completesAt: Date }>;
  failNextTowerSchedules(count?: number): void;
  setRandomRoll(value: number): void;
}

function createActionHarness(state = createState()): ActionHarness {
  const repository = new InMemoryCivilizationRepository(state);
  const completionCalls: ActionHarness['completionCalls'] = [];
  const scheduledTowers: ActionHarness['scheduledTowers'] = [];
  const towerScheduleAttempts: ActionHarness['towerScheduleAttempts'] = [];
  let towerScheduleFailuresRemaining = 0;
  let randomRoll = 0.99;

  const settlementService = {
    async settleAllResources(): Promise<void> {},
    async settlePlayer(): Promise<void> {},
  };
  const connectivityService = {
    async recalculate(): Promise<CivilizationStateRecord> {
      return state;
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
      state.completedAt = FIXED_NOW;
      return state;
    },
  };
  const queryService = {
    toState(currentState: CivilizationStateRecord): Record<string, unknown> {
      return {
        id: currentState.id,
        status: currentState.status,
        stateVersion: currentState.stateVersion,
      };
    },
    toEvent(event: CivilizationEventRecord): Record<string, unknown> {
      return { type: event.eventType, payload: event.payloadJson };
    },
  };
  const scheduleService = {
    async scheduleTower(towerId: string, gameId: string, completesAt: Date): Promise<void> {
      towerScheduleAttempts.push({ towerId, gameId, completesAt });
      if (towerScheduleFailuresRemaining > 0) {
        towerScheduleFailuresRemaining -= 1;
        throw new Error('Simulated queue outage');
      }
      scheduledTowers.push({ towerId, gameId, completesAt });
    },
  };
  const runtime = {
    now(): Date {
      return new Date(FIXED_NOW);
    },
    random(): number {
      return randomRoll;
    },
  };

  const service = new CivilizationActionsService(
    repository as unknown as CivilizationRepository,
    settlementService as unknown as CivilizationSettlementService,
    connectivityService as unknown as CivilizationConnectivityService,
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
    scheduledTowers,
    towerScheduleAttempts,
    failNextTowerSchedules(count = 1): void {
      towerScheduleFailuresRemaining = count;
    },
    setRandomRoll(value: number): void {
      randomRoll = value;
    },
  };
}

function createState(): CivilizationStateRecord {
  const createdAt = new Date('2026-07-01T00:00:00.000Z');
  const tiles: StateTile[] = [
    createTile(TEAM_A_SPAWN_TILE_ID, -1, 0, TEAM_A_ID, true),
    createTile(ORIGIN_TILE_ID, 0, 0, TEAM_A_ID, true),
    createTile(TEAM_A_BUILD_TILE_ID, 0, -1, TEAM_A_ID, true),
    createTile(TARGET_TILE_ID, 1, 0, null, false),
    createTile(TEAM_B_SPAWN_TILE_ID, 2, -1, TEAM_B_ID, true),
  ];
  const players: StatePlayer[] = [
    createPlayer(PLAYER_A_ID, USER_A_ID, TEAM_A_ID, ORIGIN_TILE_ID, TEAM_A_SPAWN_TILE_ID),
    createPlayer(PLAYER_B_ID, USER_B_ID, TEAM_B_ID, TARGET_TILE_ID, TEAM_B_SPAWN_TILE_ID),
  ];

  return {
    id: GAME_ID,
    name: 'Deterministic Civilization',
    status: CivilizationGameStatus.ACTIVE,
    startAt: new Date('2026-08-01T00:00:00.000Z'),
    endAt: new Date('2026-08-08T00:00:00.000Z'),
    completedAt: null,
    winnerTeamId: null,
    completionReason: null,
    settingsJson: structuredClone(defaultCivilizationSettings),
    createdByAdminId: 'admin-1',
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
        townHallTileId: TEAM_A_SPAWN_TILE_ID,
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
        townHallTileId: TEAM_B_SPAWN_TILE_ID,
        finalScore: null,
        createdAt,
      },
    ],
    players,
    tiles,
    spawnPoints: [
      {
        id: 'spawn-team-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        tileId: TEAM_A_SPAWN_TILE_ID,
        createdAt,
      },
      {
        id: 'spawn-team-b',
        gameId: GAME_ID,
        teamId: TEAM_B_ID,
        tileId: TEAM_B_SPAWN_TILE_ID,
        createdAt,
      },
    ],
    buildings: [],
    towers: [],
    teamResources: [
      {
        id: 'resource-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        goldAmount: new Prisma.Decimal(500),
        goldIncomePerHour: new Prisma.Decimal(0),
        lastSettledAt: FIXED_NOW,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 'resource-b',
        gameId: GAME_ID,
        teamId: TEAM_B_ID,
        goldAmount: new Prisma.Decimal(500),
        goldIncomePerHour: new Prisma.Decimal(0),
        lastSettledAt: FIXED_NOW,
        createdAt,
        updatedAt: createdAt,
      },
    ],
    attributeResources: [],
    rewardClaims: [],
    events: [],
  } as unknown as CivilizationStateRecord;
}

function createTile(
  id: string,
  q: number,
  r: number,
  ownerTeamId: string | null,
  isConnected: boolean,
): StateTile {
  return {
    id,
    gameId: GAME_ID,
    q,
    r,
    terrainType: CivilizationTerrainType.GROUND,
    ownerTeamId,
    isConnected,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  } as StateTile;
}

function createPlayer(
  id: string,
  userId: string,
  teamId: string,
  currentTileId: string,
  spawnTileId: string,
): StatePlayer {
  return {
    id,
    gameId: GAME_ID,
    teamId,
    userId,
    initialTileId: currentTileId,
    spawnTileId,
    currentTileId,
    actionPointUnits: 16,
    lastActionPointUpdateAt: FIXED_NOW,
    joinedAt: FIXED_NOW,
    isActive: true,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
    user: { id: userId, username: id, avatarUrl: null },
  } as StatePlayer;
}

function createBuilding(
  id: string,
  type: CivilizationBuildingType,
  ownerTeamId: string | null,
  captureProgressUnits = 0,
  captureTeamId: string | null = null,
  captureRequiredUnits = 6,
): StateBuilding {
  return {
    id,
    gameId: GAME_ID,
    tileId: TARGET_TILE_ID,
    buildingType: type,
    attributeKey: null,
    ownerTeamId,
    captureTeamId,
    captureProgressUnits,
    captureRequiredUnits,
    incomePerHour: new Prisma.Decimal(0),
    status: CivilizationBuildingStatus.ACTIVE,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  } as StateBuilding;
}

function createTower(
  id: string,
  teamId: string,
  tileId: string,
  status: CivilizationTowerStatus,
): StateTower {
  return {
    id,
    gameId: GAME_ID,
    teamId,
    tileId,
    status,
    workKind: null,
    protectionRadius: 1,
    destructionProgressActions: status === CivilizationTowerStatus.DESTROYED ? 3 : 0,
    destructionRequiredActions: 3,
    constructionStartedAt: new Date('2026-08-01T09:00:00.000Z'),
    constructionCompletesAt:
      status === CivilizationTowerStatus.UNDER_CONSTRUCTION ? FIXED_NOW : null,
    destroyedAt: status === CivilizationTowerStatus.DESTROYED ? FIXED_NOW : null,
    createdByPlayerId: null,
    createdAt: FIXED_NOW,
    updatedAt: FIXED_NOW,
  } as StateTower;
}

function player(state: CivilizationStateRecord, playerId: string): StatePlayer {
  const found = state.players.find((candidate) => candidate.id === playerId);
  if (!found) throw new Error(`Missing fixture player ${playerId}`);
  return found;
}

function tile(state: CivilizationStateRecord, tileId: string): StateTile {
  const found = state.tiles.find((candidate) => candidate.id === tileId);
  if (!found) throw new Error(`Missing fixture tile ${tileId}`);
  return found;
}

function findBuilding(state: CivilizationStateRecord, buildingId: string): StateBuilding {
  const found = state.buildings.find((candidate) => candidate.id === buildingId);
  if (!found) throw new Error(`Missing fixture building ${buildingId}`);
  return found;
}

function findTower(state: CivilizationStateRecord, towerId: string): StateTower {
  const found = state.towers.find((candidate) => candidate.id === towerId);
  if (!found) throw new Error(`Missing fixture tower ${towerId}`);
  return found;
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

describe('Civilization movement actions', () => {
  test('allows allied players to share their own team spawn', async () => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    state.players.push(
      createPlayer(
        PLAYER_A_TWO_ID,
        USER_A_TWO_ID,
        TEAM_A_ID,
        TEAM_A_SPAWN_TILE_ID,
        TEAM_A_SPAWN_TILE_ID,
      ),
    );
    const harness = createActionHarness(state);

    await harness.service.move(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000010000',
      target: { q: -1, r: 0 },
    });

    expect(player(state, PLAYER_A_ID).currentTileId).toBe(TEAM_A_SPAWN_TILE_ID);
    expect(
      state.players.filter((candidate) => candidate.currentTileId === TEAM_A_SPAWN_TILE_ID),
    ).toHaveLength(2);
  });

  test('rejects movement onto a regular hex occupied by a teammate', async () => {
    const state = createState();
    tile(state, TARGET_TILE_ID).ownerTeamId = TEAM_A_ID;
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    state.players.push(
      createPlayer(PLAYER_A_TWO_ID, USER_A_TWO_ID, TEAM_A_ID, TARGET_TILE_ID, TEAM_A_SPAWN_TILE_ID),
    );
    const harness = createActionHarness(state);

    await expectCivilizationError(
      harness.service.move(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000010001',
        target: { q: 1, r: 0 },
      }),
      CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_PLAYER,
    );
    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(16);
  });

  test.each([
    ['neutral', null],
    ['empty enemy', TEAM_B_ID],
  ] as const)('captures an adjacent %s tile for one AP', async (_label, previousOwner) => {
    const state = createState();
    tile(state, TARGET_TILE_ID).ownerTeamId = previousOwner;
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const harness = createActionHarness(state);

    await harness.service.move(GAME_ID, USER_A_ID, {
      actionId:
        previousOwner === null
          ? '00000000-0000-4000-8000-000000010002'
          : '00000000-0000-4000-8000-000000010003',
      target: { q: 1, r: 0 },
    });

    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(14);
    expect(tile(state, TARGET_TILE_ID).ownerTeamId).toBe(TEAM_A_ID);
    expect(harness.repository.events.map((event) => event.eventType)).toContain(
      CivilizationEventType.TILE_CAPTURED,
    );
  });

  test('requires combat instead of moving onto an enemy player', async () => {
    const harness = createActionHarness();

    await expectCivilizationError(
      harness.service.move(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000010004',
        target: { q: 1, r: 0 },
      }),
      CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_ENEMY,
    );

    expect(player(harness.state, PLAYER_A_ID).actionPointUnits).toBe(16);
  });

  test('never allows movement onto a tower tile', async () => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    tile(state, TARGET_TILE_ID).ownerTeamId = TEAM_B_ID;
    tile(state, TARGET_TILE_ID).isConnected = true;
    state.towers.push(
      createTower('tower-b', TEAM_B_ID, TARGET_TILE_ID, CivilizationTowerStatus.ACTIVE),
    );
    const harness = createActionHarness(state);

    await expectCivilizationError(
      harness.service.move(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000010005',
        target: { q: 1, r: 0 },
      }),
      CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_STRUCTURE,
    );

    tile(state, TARGET_TILE_ID).isConnected = false;
    await expectCivilizationError(
      harness.service.move(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000010006',
        target: { q: 1, r: 0 },
      }),
      CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_STRUCTURE,
    );
  });

  test("rejects movement onto another team's spawn even when it is empty", async () => {
    const state = createState();
    state.spawnPoints.find((spawn) => spawn.teamId === TEAM_B_ID)!.tileId = TARGET_TILE_ID;
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const harness = createActionHarness(state);

    await expectCivilizationError(
      harness.service.move(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000010010',
        target: { q: 1, r: 0 },
      }),
      CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_ENEMY,
    );

    expect(player(state, PLAYER_A_ID).currentTileId).toBe(ORIGIN_TILE_ID);
    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(16);
  });

  test('never captures a tower tile by moving onto a tower under construction', async () => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    tile(state, TARGET_TILE_ID).ownerTeamId = TEAM_B_ID;
    const tower = createTower(
      'tower-under-construction',
      TEAM_B_ID,
      TARGET_TILE_ID,
      CivilizationTowerStatus.UNDER_CONSTRUCTION,
    );
    state.towers.push(tower);
    const harness = createActionHarness(state);
    const previousGold = state.teamResources[1]!.goldAmount.toString();

    await expectCivilizationError(
      harness.service.move(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000010007',
        target: { q: 1, r: 0 },
      }),
      CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_STRUCTURE,
    );

    expect(findTower(state, tower.id).status).toBe(CivilizationTowerStatus.UNDER_CONSTRUCTION);
    expect(state.teamResources[1]!.goldAmount.toString()).toBe(previousGold);
    expect(harness.repository.events).toHaveLength(0);
  });

  test('captures an enemy tile with a destroyed tower for the normal enemy-tile cost', async () => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    tile(state, TARGET_TILE_ID).ownerTeamId = TEAM_B_ID;
    const tower = createTower(
      'destroyed-enemy-tower',
      TEAM_B_ID,
      TARGET_TILE_ID,
      CivilizationTowerStatus.DESTROYED,
    );
    state.towers.push(tower);
    const harness = createActionHarness(state);

    await harness.service.move(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000010010',
      target: { q: 1, r: 0 },
    });

    expect(player(state, PLAYER_A_ID).currentTileId).toBe(TARGET_TILE_ID);
    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(14);
    expect(tile(state, TARGET_TILE_ID).ownerTeamId).toBe(TEAM_A_ID);
    expect(state.towers.some((candidate) => candidate.id === tower.id)).toBe(false);
    expect(harness.repository.deleteTowerCalls).toContain(tower.id);
  });

  test('serializes simultaneous attempts to capture the same neutral tile', async () => {
    const state = createState();
    state.tiles.push(createTile(TEAM_B_APPROACH_TILE_ID, 2, 0, TEAM_B_ID, true));
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_APPROACH_TILE_ID;
    const harness = createActionHarness(state);

    await Promise.all([
      harness.service.move(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000010008',
        target: { q: 1, r: 0 },
      }),
      expectCivilizationError(
        harness.service.move(GAME_ID, USER_B_ID, {
          actionId: '00000000-0000-4000-8000-000000010009',
          target: { q: 1, r: 0 },
        }),
        CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_ENEMY,
      ),
    ]);

    expect(tile(state, TARGET_TILE_ID).ownerTeamId).toBe(TEAM_A_ID);
    expect(player(state, PLAYER_A_ID).currentTileId).toBe(TARGET_TILE_ID);
    expect(player(state, PLAYER_B_ID).currentTileId).toBe(TEAM_B_APPROACH_TILE_ID);
    expect(
      harness.repository.events.filter(
        (event) => event.eventType === CivilizationEventType.TILE_CAPTURED,
      ),
    ).toHaveLength(1);
  });
});

describe('Civilization player combat', () => {
  test('uses the injected roll, respawns the defender, moves the winner, and captures the tile', async () => {
    const state = createState();
    tile(state, TARGET_TILE_ID).ownerTeamId = TEAM_B_ID;
    const harness = createActionHarness(state);
    harness.setRandomRoll(0.299999);

    await harness.service.attackPlayer(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000020001',
      targetPlayerId: PLAYER_B_ID,
    });

    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(12);
    expect(player(state, PLAYER_B_ID).currentTileId).toBe(TEAM_B_SPAWN_TILE_ID);
    expect(player(state, PLAYER_A_ID).currentTileId).toBe(TARGET_TILE_ID);
    expect(tile(state, TARGET_TILE_ID).ownerTeamId).toBe(TEAM_A_ID);
    const attack = harness.repository.events.find(
      (event) => event.eventType === CivilizationEventType.PLAYER_ATTACKED,
    );
    expect(attack?.payloadJson).toMatchObject({
      randomRoll: 0.299999,
      attackerWon: true,
      attackerMoved: true,
      respawnTileId: TEAM_B_SPAWN_TILE_ID,
    });
  });

  test('treats the exact probability boundary as a defender win and keeps spent AP', async () => {
    const harness = createActionHarness();
    harness.setRandomRoll(0.3);

    await harness.service.attackPlayer(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000020002',
      targetPlayerId: PLAYER_B_ID,
    });

    expect(player(harness.state, PLAYER_A_ID).actionPointUnits).toBe(12);
    expect(player(harness.state, PLAYER_A_ID).currentTileId).toBe(ORIGIN_TILE_ID);
    expect(player(harness.state, PLAYER_B_ID).currentTileId).toBe(TARGET_TILE_ID);
    expect(harness.repository.events.at(-1)?.payloadJson).toMatchObject({
      randomRoll: 0.3,
      attackerWon: false,
      attackerMoved: false,
    });
  });

  test('keeps the attacker in place while another defender remains on the target tile', async () => {
    const state = createState();
    state.players.push(
      createPlayer(PLAYER_B_TWO_ID, USER_B_TWO_ID, TEAM_B_ID, TARGET_TILE_ID, TEAM_B_SPAWN_TILE_ID),
    );
    const harness = createActionHarness(state);
    harness.setRandomRoll(0);

    await harness.service.attackPlayer(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000020003',
      targetPlayerId: PLAYER_B_ID,
    });

    expect(player(state, PLAYER_B_ID).currentTileId).toBe(TEAM_B_SPAWN_TILE_ID);
    expect(player(state, PLAYER_B_TWO_ID).currentTileId).toBe(TARGET_TILE_ID);
    expect(player(state, PLAYER_A_ID).currentTileId).toBe(ORIGIN_TILE_ID);
  });

  test('respawns onto the occupied spawn owned by the defeated player team', async () => {
    const state = createState();
    state.players.push(
      createPlayer(
        PLAYER_B_TWO_ID,
        USER_B_TWO_ID,
        TEAM_B_ID,
        TEAM_B_SPAWN_TILE_ID,
        TEAM_B_SPAWN_TILE_ID,
      ),
    );
    const harness = createActionHarness(state);
    harness.setRandomRoll(0);

    await harness.service.attackPlayer(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000020004',
      targetPlayerId: PLAYER_B_ID,
    });

    expect(player(state, PLAYER_B_ID).currentTileId).toBe(TEAM_B_SPAWN_TILE_ID);
    expect(
      state.players.filter((candidate) => candidate.currentTileId === TEAM_B_SPAWN_TILE_ID),
    ).toHaveLength(2);
    const respawn = harness.repository.events.find(
      (event) => event.eventType === CivilizationEventType.PLAYER_RESPAWNED,
    );
    expect(respawn?.payloadJson).toMatchObject({
      teamSpawnTileId: TEAM_B_SPAWN_TILE_ID,
    });
  });
});

describe('Civilization building capture', () => {
  test('combines contributions from several players and resets progress on ownership transfer', async () => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TEAM_A_SPAWN_TILE_ID;
    state.players.push(
      createPlayer(
        PLAYER_A_TWO_ID,
        USER_A_TWO_ID,
        TEAM_A_ID,
        TEAM_B_SPAWN_TILE_ID,
        TEAM_A_SPAWN_TILE_ID,
      ),
    );
    const building = createBuilding(
      'gold-building',
      CivilizationBuildingType.GOLD_BUILDING,
      TEAM_B_ID,
    );
    state.buildings.push(building);
    const harness = createActionHarness(state);

    await harness.service.captureBuilding(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000030001',
      buildingId: building.id,
    });
    await harness.service.captureBuilding(GAME_ID, USER_A_TWO_ID, {
      actionId: '00000000-0000-4000-8000-000000030002',
      buildingId: building.id,
    });
    await harness.service.captureBuilding(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000030003',
      buildingId: building.id,
    });

    expect(findBuilding(state, building.id).ownerTeamId).toBe(TEAM_A_ID);
    expect(findBuilding(state, building.id).captureTeamId).toBeNull();
    expect(findBuilding(state, building.id).captureProgressUnits).toBe(0);
    expect(tile(state, TARGET_TILE_ID).ownerTeamId).toBe(TEAM_A_ID);
    expect(player(state, PLAYER_A_ID).currentTileId).toBe(ORIGIN_TILE_ID);
    expect(player(state, PLAYER_A_TWO_ID).currentTileId).toBe(TEAM_B_SPAWN_TILE_ID);
    expect(harness.repository.events.at(-1)?.eventType).toBe(
      CivilizationEventType.BUILDING_CAPTURED,
    );
  });

  test('removes hostile capture progress before a later contribution starts counter-capture', async () => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const building = createBuilding(
      'attribute-building',
      CivilizationBuildingType.ATTRIBUTE_BUILDING,
      TEAM_B_ID,
      4,
      TEAM_B_ID,
    );
    state.buildings.push(building);
    const harness = createActionHarness(state);

    await harness.service.captureBuilding(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000030004',
      buildingId: building.id,
    });
    expect(findBuilding(state, building.id).captureProgressUnits).toBe(2);
    expect(findBuilding(state, building.id).captureTeamId).toBe(TEAM_B_ID);

    await harness.service.captureBuilding(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000030005',
      buildingId: building.id,
    });
    expect(findBuilding(state, building.id).captureProgressUnits).toBe(0);
    expect(findBuilding(state, building.id).captureTeamId).toBeNull();

    await harness.service.captureBuilding(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000030006',
      buildingId: building.id,
    });
    expect(findBuilding(state, building.id).captureProgressUnits).toBe(2);
    expect(findBuilding(state, building.id).captureTeamId).toBe(TEAM_A_ID);
  });
});

describe('Civilization tower actions', () => {
  test.each([
    ['team spawn', { q: -1, r: 0 }],
    ['player-occupied regular tile', { q: 0, r: 0 }],
  ])('rejects construction on the %s', async (_label, coordinate) => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const harness = createActionHarness(state);

    await expectCivilizationError(
      harness.service.buildTower(GAME_ID, USER_A_ID, {
        actionId:
          coordinate.q === -1
            ? '00000000-0000-4000-8000-000000040010'
            : '00000000-0000-4000-8000-000000040011',
        tile: coordinate,
      }),
      CIVILIZATION_ERROR_CODES.TOWER_PLACEMENT_INVALID,
    );
    expect(state.towers).toHaveLength(0);
    expect(state.teamResources[0]!.goldAmount.toString()).toBe('500');
  });

  test('spends gold, starts construction, and schedules deterministic completion', async () => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const harness = createActionHarness(state);

    await harness.service.buildTower(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000040001',
      tile: { q: 0, r: -1 },
    });

    expect(state.teamResources[0]!.goldAmount.toString()).toBe('300');
    expect(state.towers).toHaveLength(1);
    expect(state.towers[0]).toMatchObject({
      teamId: TEAM_A_ID,
      tileId: TEAM_A_BUILD_TILE_ID,
      status: CivilizationTowerStatus.UNDER_CONSTRUCTION,
      protectionRadius: 1,
    });
    expect(state.towers[0]?.constructionCompletesAt?.toISOString()).toBe(
      '2026-08-01T15:00:00.000Z',
    );
    expect(harness.scheduledTowers).toEqual([
      {
        towerId: state.towers[0]!.id,
        gameId: GAME_ID,
        completesAt: new Date('2026-08-01T15:00:00.000Z'),
      },
    ]);
  });

  test('rejects construction on an owned connected tile beyond one hex', async () => {
    const state = createState();
    state.tiles.push(createTile(TEAM_A_REMOTE_TILE_ID, 2, 0, TEAM_A_ID, true));
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const harness = createActionHarness(state);

    await expectCivilizationError(
      harness.service.buildTower(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000040012',
        tile: { q: 2, r: 0 },
      }),
      CIVILIZATION_ERROR_CODES.TOWER_PLACEMENT_INVALID,
    );
    expect(state.towers).toHaveLength(0);
    expect(state.teamResources[0]!.goldAmount.toString()).toBe('500');
  });

  test('rejects overlapping protection radii before spending gold', async () => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    state.towers.push(
      createTower('nearby-tower', TEAM_A_ID, TARGET_TILE_ID, CivilizationTowerStatus.ACTIVE),
    );
    const harness = createActionHarness(state);

    await expectCivilizationError(
      harness.service.buildTower(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000040002',
        tile: { q: 0, r: -1 },
      }),
      CIVILIZATION_ERROR_CODES.TOWER_RADIUS_OVERLAP,
    );
    expect(state.teamResources[0]!.goldAmount.toString()).toBe('500');
  });

  test('tracks attacks and destroys an enemy tower at its configured action limit', async () => {
    const state = createState();
    const tower = createTower(
      'enemy-tower',
      TEAM_B_ID,
      TARGET_TILE_ID,
      CivilizationTowerStatus.ACTIVE,
    );
    tower.protectionRadius = 0;
    tower.destructionRequiredActions = 2;
    state.towers.push(tower);
    const harness = createActionHarness(state);

    await harness.service.attackTower(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000040003',
      towerId: tower.id,
    });

    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(10);
    expect(findTower(state, tower.id)).toMatchObject({
      status: CivilizationTowerStatus.ACTIVE,
      destructionProgressActions: 1,
    });

    await harness.service.attackTower(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000040015',
      towerId: tower.id,
    });

    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(4);
    expect(findTower(state, tower.id).status).toBe(CivilizationTowerStatus.DESTROYED);
    expect(findTower(state, tower.id).destructionProgressActions).toBe(2);
    expect(findTower(state, tower.id).destroyedAt).toEqual(FIXED_NOW);
  });

  test('attacks an enemy tower from its configured protection boundary', async () => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TARGET_TILE_ID;
    const tower = createTower(
      'radius-two-enemy-tower',
      TEAM_B_ID,
      TEAM_B_SPAWN_TILE_ID,
      CivilizationTowerStatus.ACTIVE,
    );
    tower.protectionRadius = 1;
    state.towers.push(tower);
    const harness = createActionHarness(state);

    await harness.service.attackTower(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000040013',
      towerId: tower.id,
    });

    expect(findTower(state, tower.id)).toMatchObject({
      status: CivilizationTowerStatus.ACTIVE,
      destructionProgressActions: 1,
    });
  });

  test('rejects a tower attack from inside its protection boundary', async () => {
    const state = createState();
    const tower = createTower(
      'radius-two-adjacent-tower',
      TEAM_B_ID,
      TARGET_TILE_ID,
      CivilizationTowerStatus.ACTIVE,
    );
    tower.protectionRadius = 2;
    state.towers.push(tower);
    const harness = createActionHarness(state);

    await expectCivilizationError(
      harness.service.attackTower(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000040014',
        towerId: tower.id,
      }),
      CIVILIZATION_ERROR_CODES.TOWER_NOT_ATTACKABLE,
    );
    expect(findTower(state, tower.id).status).toBe(CivilizationTowerStatus.ACTIVE);
  });

  test('applies configured Catapult damage and charges one idempotent purchase', async () => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const settings = structuredClone(defaultCivilizationSettings);
    settings.catapult.damage = 1;
    state.settingsJson = settings;
    const tower = createTower(
      'catapult-target',
      TEAM_B_ID,
      TARGET_TILE_ID,
      CivilizationTowerStatus.ACTIVE,
    );
    tower.protectionRadius = 0;
    state.towers.push(tower);
    const harness = createActionHarness(state);
    const request = {
      actionId: '00000000-0000-4000-8000-000000040008',
      towerId: tower.id,
    };

    await harness.service.catapultAttack(GAME_ID, USER_A_ID, request);
    await harness.service.catapultAttack(GAME_ID, USER_A_ID, request);

    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(12);
    expect(state.teamResources[0]!.goldAmount.toString()).toBe('350');
    expect(findTower(state, tower.id)).toMatchObject({
      status: CivilizationTowerStatus.ACTIVE,
      destructionProgressActions: 1,
      destructionRequiredActions: 3,
    });
    expect(
      harness.repository.events.filter(
        (event) => event.eventType === CivilizationEventType.CATAPULT_ATTACKED,
      ),
    ).toHaveLength(1);
  });

  test('destroys an enemy tower under construction with one Catapult charge', async () => {
    const state = createState();
    const settings = structuredClone(defaultCivilizationSettings);
    settings.catapult.damage = 1;
    state.settingsJson = settings;
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const tower = createTower(
      'catapult-construction-target',
      TEAM_B_ID,
      TARGET_TILE_ID,
      CivilizationTowerStatus.UNDER_CONSTRUCTION,
    );
    tower.protectionRadius = 0;
    tower.workKind = CivilizationTowerWorkKind.BUILD;
    tower.constructionCompletesAt = new Date('2026-08-01T13:00:00.000Z');
    state.towers.push(tower);
    const harness = createActionHarness(state);

    await harness.service.catapultAttack(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000040023',
      towerId: tower.id,
    });

    expect(findTower(state, tower.id)).toMatchObject({
      status: CivilizationTowerStatus.DESTROYED,
      destructionProgressActions: 3,
      destructionRequiredActions: 3,
      workKind: null,
      constructionCompletesAt: null,
      destroyedAt: FIXED_NOW,
    });
    expect(harness.repository.events.at(-1)?.payloadJson).toMatchObject({
      towerId: tower.id,
      damageActions: 1,
      destroyed: true,
      wasUnderConstruction: true,
    });
  });

  test('applies full displayed Catapult damage against an adjacent enemy town hall', async () => {
    const state = createState();
    const settings = structuredClone(defaultCivilizationSettings);
    settings.catapult.damage = 2;
    state.settingsJson = settings;
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    tile(state, TARGET_TILE_ID).ownerTeamId = TEAM_B_ID;
    const townHall = createBuilding(
      'catapult-town-hall-target',
      CivilizationBuildingType.TOWN_HALL,
      TEAM_B_ID,
      0,
      null,
      6,
    );
    state.buildings.push(townHall);
    const harness = createActionHarness(state);

    await harness.service.catapultAttack(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000040018',
      townHallBuildingId: townHall.id,
    });

    expect(findBuilding(state, townHall.id)).toMatchObject({
      status: CivilizationBuildingStatus.ACTIVE,
      captureTeamId: TEAM_A_ID,
      captureProgressUnits: 4,
    });

    await harness.service.catapultAttack(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000040019',
      townHallBuildingId: townHall.id,
    });

    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(8);
    expect(state.teamResources[0]!.goldAmount.toString()).toBe('200');
    expect(findBuilding(state, townHall.id)).toMatchObject({
      status: CivilizationBuildingStatus.CAPTURED,
      captureTeamId: null,
      captureProgressUnits: 0,
    });
    expect(tile(state, TARGET_TILE_ID).ownerTeamId).toBe(TEAM_A_ID);
    expect(harness.completionCalls).toEqual([
      {
        gameId: GAME_ID,
        reason: CivilizationCompletionReason.TOWN_HALL_CAPTURED,
        winnerTeamId: TEAM_A_ID,
      },
    ]);
    expect(
      harness.repository.events.filter(
        (event) => event.eventType === CivilizationEventType.CATAPULT_ATTACKED,
      ),
    ).toHaveLength(2);
    expect(harness.repository.events.at(-1)?.payloadJson).toMatchObject({
      townHallBuildingId: townHall.id,
      damageActions: 2,
      damageCaptureProgressUnits: 4,
      captureProgressUnits: 6,
      captureRequiredUnits: 6,
      captured: true,
    });
  });

  test('applies the same displayed Catapult damage to an enemy resource building', async () => {
    const state = createState();
    const settings = structuredClone(defaultCivilizationSettings);
    settings.catapult.damage = 2;
    state.settingsJson = settings;
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    tile(state, TARGET_TILE_ID).ownerTeamId = TEAM_B_ID;
    const building = createBuilding(
      'catapult-gold-building-target',
      CivilizationBuildingType.GOLD_BUILDING,
      TEAM_B_ID,
      0,
      null,
      6,
    );
    state.buildings.push(building);
    const harness = createActionHarness(state);

    await harness.service.catapultAttack(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000040021',
      buildingId: building.id,
    });

    expect(findBuilding(state, building.id)).toMatchObject({
      ownerTeamId: TEAM_B_ID,
      status: CivilizationBuildingStatus.ACTIVE,
      captureTeamId: TEAM_A_ID,
      captureProgressUnits: 4,
    });
    expect(harness.repository.events.at(-1)?.payloadJson).toMatchObject({
      buildingId: building.id,
      damageActions: 2,
      damageCaptureProgressUnits: 4,
      captureProgressUnits: 4,
      captured: false,
    });

    await harness.service.catapultAttack(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000040022',
      buildingId: building.id,
    });

    expect(findBuilding(state, building.id)).toMatchObject({
      ownerTeamId: TEAM_A_ID,
      status: CivilizationBuildingStatus.ACTIVE,
      captureTeamId: null,
      captureProgressUnits: 0,
    });
    expect(tile(state, TARGET_TILE_ID).ownerTeamId).toBe(TEAM_A_ID);
    expect(harness.completionCalls).toEqual([]);
  });

  test('rejects a Catapult request with more than one target before charging resources', async () => {
    const state = createState();
    const harness = createActionHarness(state);

    await expectCivilizationError(
      harness.service.catapultAttack(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000040020',
        towerId: 'tower-target',
        townHallBuildingId: 'town-hall-target',
      }),
      CIVILIZATION_ERROR_CODES.CATAPULT_TARGET_INVALID,
    );

    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(16);
    expect(state.teamResources[0]!.goldAmount.toString()).toBe('500');
  });

  test('repairs an owned connected tower immediately for AP and gold', async () => {
    const state = createState();
    tile(state, TARGET_TILE_ID).ownerTeamId = TEAM_A_ID;
    tile(state, TARGET_TILE_ID).isConnected = true;
    const tower = createTower(
      'repairable-tower',
      TEAM_A_ID,
      TARGET_TILE_ID,
      CivilizationTowerStatus.DESTROYED,
    );
    state.towers.push(tower);
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const harness = createActionHarness(state);

    await harness.service.repairTower(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000040004',
      towerId: tower.id,
    });

    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(14);
    expect(state.teamResources[0]!.goldAmount.toString()).toBe('425');
    expect(findTower(state, tower.id).status).toBe(CivilizationTowerStatus.ACTIVE);
    expect(findTower(state, tower.id).destructionProgressActions).toBe(2);
    expect(findTower(state, tower.id).destroyedAt).toBeNull();
  });

  test('uses the configured Repair Kit amount and gold price on a damaged active tower', async () => {
    const state = createState();
    const settings = structuredClone(defaultCivilizationSettings);
    settings.repairKit.repairActions = 2;
    settings.repairKit.goldPrice = '110';
    state.settingsJson = settings;
    tile(state, TARGET_TILE_ID).ownerTeamId = TEAM_A_ID;
    tile(state, TARGET_TILE_ID).isConnected = true;
    const tower = createTower(
      'damaged-active-tower',
      TEAM_A_ID,
      TARGET_TILE_ID,
      CivilizationTowerStatus.ACTIVE,
    );
    tower.destructionProgressActions = 2;
    state.towers.push(tower);
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const harness = createActionHarness(state);

    await harness.service.repairTower(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000040016',
      towerId: tower.id,
    });

    expect(findTower(state, tower.id)).toMatchObject({
      status: CivilizationTowerStatus.ACTIVE,
      destructionProgressActions: 0,
      workKind: null,
      destroyedAt: null,
    });
    expect(state.teamResources[0]!.goldAmount.toString()).toBe('390');
    expect(harness.repository.events.at(-1)?.payloadJson).toMatchObject({
      repairActions: 2,
      destructionProgressActions: 0,
      goldSpent: '110',
    });
  });

  test('rejects a Repair Kit when the player is not next to the allied tower', async () => {
    const state = createState();
    state.tiles.push(createTile(TEAM_A_REMOTE_TILE_ID, 4, 0, TEAM_A_ID, true));
    const tower = createTower(
      'remote-damaged-tower',
      TEAM_A_ID,
      TEAM_A_REMOTE_TILE_ID,
      CivilizationTowerStatus.ACTIVE,
    );
    tower.destructionProgressActions = 1;
    state.towers.push(tower);
    const harness = createActionHarness(state);

    await expectCivilizationError(
      harness.service.repairTower(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000040017',
        towerId: tower.id,
      }),
      CIVILIZATION_ERROR_CODES.TOWER_NOT_REPAIRABLE,
    );
    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(16);
    expect(state.teamResources[0]!.goldAmount.toString()).toBe('500');
  });

  test('serializes simultaneous team-gold spending and prevents an overdraft', async () => {
    const state = createState();
    state.tiles.push(createTile(TEAM_A_REMOTE_TILE_ID, 4, 0, TEAM_A_ID, true));
    state.tiles.push(createTile('remote-build-tile', 5, 0, TEAM_A_ID, true));
    state.players.push(
      createPlayer(
        PLAYER_A_TWO_ID,
        USER_A_TWO_ID,
        TEAM_A_ID,
        TEAM_A_REMOTE_TILE_ID,
        TEAM_A_SPAWN_TILE_ID,
      ),
    );
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    state.teamResources[0]!.goldAmount = new Prisma.Decimal(250);
    const harness = createActionHarness(state);

    await Promise.all([
      harness.service.buildTower(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000040005',
        tile: { q: 0, r: -1 },
      }),
      expectCivilizationError(
        harness.service.buildTower(GAME_ID, USER_A_TWO_ID, {
          actionId: '00000000-0000-4000-8000-000000040006',
          tile: { q: 5, r: 0 },
        }),
        CIVILIZATION_ERROR_CODES.NOT_ENOUGH_TEAM_GOLD,
      ),
    ]);

    expect(state.teamResources[0]!.goldAmount.toString()).toBe('50');
    expect(state.towers).toHaveLength(1);
    expect(harness.repository.actions).toHaveLength(1);
    expect(
      harness.repository.events.filter(
        (event) => event.eventType === CivilizationEventType.TEAM_GOLD_SPENT,
      ),
    ).toHaveLength(1);
  });
});

describe('Civilization town-hall actions', () => {
  test('captures an adjacent enemy town hall without moving onto its hex', async () => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const townHall = createBuilding(
      'town-hall-adjacent',
      CivilizationBuildingType.TOWN_HALL,
      TEAM_B_ID,
      0,
      null,
      16,
    );
    state.buildings.push(townHall);
    const harness = createActionHarness(state);

    await harness.service.captureTownHall(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000050000',
      townHallBuildingId: townHall.id,
    });

    expect(player(state, PLAYER_A_ID).currentTileId).toBe(ORIGIN_TILE_ID);
    expect(findBuilding(state, townHall.id).captureProgressUnits).toBe(2);
  });

  test('combines several players contributions, completes the game, and rejects later actions', async () => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TEAM_A_SPAWN_TILE_ID;
    state.players.push(
      createPlayer(
        PLAYER_A_TWO_ID,
        USER_A_TWO_ID,
        TEAM_A_ID,
        TEAM_B_SPAWN_TILE_ID,
        TEAM_A_SPAWN_TILE_ID,
      ),
    );
    const townHall = createBuilding(
      'town-hall-b',
      CivilizationBuildingType.TOWN_HALL,
      TEAM_B_ID,
      12,
      TEAM_A_ID,
      16,
    );
    state.buildings.push(townHall);
    const harness = createActionHarness(state);

    await harness.service.captureTownHall(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000050001',
      townHallBuildingId: townHall.id,
    });
    expect(findBuilding(state, townHall.id).captureProgressUnits).toBe(14);

    await harness.service.captureTownHall(GAME_ID, USER_A_TWO_ID, {
      actionId: '00000000-0000-4000-8000-000000050002',
      townHallBuildingId: townHall.id,
    });
    expect(harness.completionCalls).toEqual([
      {
        gameId: GAME_ID,
        reason: CivilizationCompletionReason.TOWN_HALL_CAPTURED,
        winnerTeamId: TEAM_A_ID,
      },
    ]);
    expect(state.status).toBe(CivilizationGameStatus.COMPLETED);

    await expectCivilizationError(
      harness.service.captureTownHall(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000050003',
        townHallBuildingId: townHall.id,
      }),
      CIVILIZATION_ERROR_CODES.GAME_NOT_ACTIVE,
    );
  });

  test('rejects capture while a connected active tower protects the town hall', async () => {
    const state = createState();
    player(state, PLAYER_A_ID).currentTileId = TARGET_TILE_ID;
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const townHall = createBuilding(
      'town-hall-protected',
      CivilizationBuildingType.TOWN_HALL,
      TEAM_B_ID,
      0,
      null,
      16,
    );
    state.buildings.push(townHall);
    state.towers.push(
      createTower(
        'town-hall-tower',
        TEAM_B_ID,
        TEAM_B_SPAWN_TILE_ID,
        CivilizationTowerStatus.ACTIVE,
      ),
    );
    const harness = createActionHarness(state);

    await expectCivilizationError(
      harness.service.captureTownHall(GAME_ID, USER_A_ID, {
        actionId: '00000000-0000-4000-8000-000000050004',
        townHallBuildingId: townHall.id,
      }),
      CIVILIZATION_ERROR_CODES.TOWN_HALL_PROTECTED,
    );
  });

  test('Repair Kit removes one displayed progress point from an adjacent allied town hall', async () => {
    const state = createState();
    const settings = structuredClone(defaultCivilizationSettings);
    settings.repairKit.repairActions = 1;
    settings.repairKit.goldPrice = '90';
    state.settingsJson = settings;
    tile(state, TARGET_TILE_ID).ownerTeamId = TEAM_A_ID;
    tile(state, TARGET_TILE_ID).isConnected = true;
    const townHall = createBuilding(
      'town-hall-a',
      CivilizationBuildingType.TOWN_HALL,
      TEAM_A_ID,
      3,
      TEAM_B_ID,
      16,
    );
    state.buildings.push(townHall);
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const harness = createActionHarness(state);

    await harness.service.repairTower(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000050005',
      buildingId: townHall.id,
    });

    expect(findBuilding(state, townHall.id).captureProgressUnits).toBe(1);
    expect(findBuilding(state, townHall.id).captureTeamId).toBe(TEAM_B_ID);
    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(14);
    expect(state.teamResources[0]!.goldAmount.toString()).toBe('410');
    expect(harness.repository.events).toContainEqual(
      expect.objectContaining({
        eventType: CivilizationEventType.TEAM_GOLD_SPENT,
        payloadJson: expect.objectContaining({
          amount: '90',
          previousBalance: '500',
          resultingBalance: '410',
        }),
      }),
    );
    expect(harness.repository.events.at(-1)?.payloadJson).toMatchObject({
      townHallBuildingId: townHall.id,
      repairActions: 1,
      repairedCaptureProgressUnits: 2,
      captureProgressUnits: 1,
      source: 'REPAIR_KIT',
    });
  });

  test('Repair Kit restores the same displayed amount on an allied attribute building', async () => {
    const state = createState();
    const settings = structuredClone(defaultCivilizationSettings);
    settings.repairKit.repairActions = 1;
    state.settingsJson = settings;
    tile(state, TARGET_TILE_ID).ownerTeamId = TEAM_A_ID;
    tile(state, TARGET_TILE_ID).isConnected = true;
    const building = createBuilding(
      'repair-attribute-building-target',
      CivilizationBuildingType.ATTRIBUTE_BUILDING,
      TEAM_A_ID,
      3,
      TEAM_B_ID,
      6,
    );
    state.buildings.push(building);
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const harness = createActionHarness(state);

    await harness.service.repairTower(GAME_ID, USER_A_ID, {
      actionId: '00000000-0000-4000-8000-000000050006',
      buildingId: building.id,
    });

    expect(findBuilding(state, building.id)).toMatchObject({
      ownerTeamId: TEAM_A_ID,
      captureTeamId: TEAM_B_ID,
      captureProgressUnits: 1,
    });
    expect(harness.repository.events.at(-1)).toMatchObject({
      eventType: CivilizationEventType.BUILDING_CAPTURE_PROGRESS,
      payloadJson: expect.objectContaining({
        buildingId: building.id,
        repairActions: 1,
        repairedCaptureProgressUnits: 2,
        captureProgressUnits: 1,
        source: 'REPAIR_KIT',
      }),
    });
  });
});

describe('Civilization item action validation', () => {
  test('accepts buildingId for Catapult and Repair Kit requests', async () => {
    const validationPipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    const input = {
      actionId: '00000000-0000-4000-8000-000000070001',
      buildingId: '00000000-0000-4000-8000-000000070002',
    };

    await expect(
      validationPipe.transform(input, {
        type: 'body',
        metatype: CivilizationCatapultActionDto,
      }),
    ).resolves.toMatchObject(input);
    await expect(
      validationPipe.transform(input, {
        type: 'body',
        metatype: CivilizationRepairActionDto,
      }),
    ).resolves.toMatchObject(input);
  });
});

describe('Civilization action idempotency and authorization', () => {
  test('returns the original result for a duplicate action without charging twice', async () => {
    const state = createState();
    tile(state, TARGET_TILE_ID).ownerTeamId = TEAM_A_ID;
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const harness = createActionHarness(state);
    const input = {
      actionId: '00000000-0000-4000-8000-000000060001',
      target: { q: 1, r: 0 },
    };

    const first = await harness.service.move(GAME_ID, USER_A_ID, input);
    const second = await harness.service.move(GAME_ID, USER_A_ID, input);

    expect(second).toEqual(first);
    expect(player(state, PLAYER_A_ID).actionPointUnits).toBe(15);
    expect(harness.repository.actions).toHaveLength(1);
    expect(
      harness.repository.events.filter(
        (event) => event.eventType === CivilizationEventType.PLAYER_MOVED,
      ),
    ).toHaveLength(1);
  });

  test('retries queue scheduling with the stored action after a post-commit failure', async () => {
    const state = createState();
    player(state, PLAYER_B_ID).currentTileId = TEAM_B_SPAWN_TILE_ID;
    const harness = createActionHarness(state);
    const input = {
      actionId: '00000000-0000-4000-8000-000000060003',
      tile: { q: 0, r: -1 },
    };
    harness.failNextTowerSchedules();

    await expect(harness.service.buildTower(GAME_ID, USER_A_ID, input)).rejects.toThrow(
      'Simulated queue outage',
    );
    const retryResult = await harness.service.buildTower(GAME_ID, USER_A_ID, input);

    expect(retryResult).toEqual([...harness.repository.actions.values()][0]?.resultPayload);
    expect(state.teamResources[0]!.goldAmount.toString()).toBe('300');
    expect(state.towers).toHaveLength(1);
    expect(harness.repository.actions).toHaveLength(1);
    expect(harness.towerScheduleAttempts).toHaveLength(2);
    expect(harness.scheduledTowers).toHaveLength(1);
    expect(
      harness.repository.events.filter(
        (event) => event.eventType === CivilizationEventType.TOWER_CONSTRUCTION_STARTED,
      ),
    ).toHaveLength(1);
  });

  test('rejects spectators before any AP or map mutation', async () => {
    const harness = createActionHarness();

    await expectCivilizationError(
      harness.service.move(GAME_ID, 'spectator-user', {
        actionId: '00000000-0000-4000-8000-000000060002',
        target: { q: 1, r: 0 },
      }),
      CIVILIZATION_ERROR_CODES.PLAYER_NOT_ASSIGNED,
    );

    expect(harness.repository.updatePlayerCalls).toHaveLength(0);
    expect(harness.repository.updateTileCalls).toHaveLength(0);
  });
});
