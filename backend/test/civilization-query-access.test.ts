import { describe, expect, test } from 'bun:test';
import { ForbiddenException } from '@nestjs/common';
import {
  CivilizationBuildingStatus,
  CivilizationBuildingType,
  CivilizationGameStatus,
  CivilizationTeamSide,
  CivilizationTerrainType,
  CivilizationTowerStatus,
  CivilizationTowerWorkKind,
  Prisma,
} from '@prisma/client';

import { CivilizationQueryService } from '../src/modules/civilization/civilization-query.service';
import { CIVILIZATION_ERROR_CODES } from '../src/modules/civilization/civilization.errors';
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
const TEAM_B_ID = '00000000-0000-4000-8000-00000000000b';
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
      {
        id: 'spawn-team-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        tileId: 'tile-a',
        createdAt: FIXED_NOW,
      },
    ],
    buildings: [],
    towers: [],
    teamResources: [],
    attributeResources: [],
    rewardClaims: [],
    events: [],
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

  test('includes map coordinates for enabled building and tower interactions', () => {
    const state = createQueryState(CivilizationGameStatus.ACTIVE);
    state.buildings = [
      {
        id: 'building-neutral',
        gameId: GAME_ID,
        tileId: 'tile-a',
        buildingType: CivilizationBuildingType.GOLD_BUILDING,
        attributeKey: null,
        ownerTeamId: null,
        captureTeamId: null,
        captureProgressUnits: 0,
        captureRequiredUnits: 6,
        incomePerHour: new Prisma.Decimal(25),
        status: CivilizationBuildingStatus.ACTIVE,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];
    state.tiles.push({
      id: 'tile-b',
      gameId: GAME_ID,
      q: 1,
      r: 0,
      terrainType: CivilizationTerrainType.GROUND,
      ownerTeamId: TEAM_B_ID,
      isConnected: false,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    state.towers = [
      {
        id: 'tower-b',
        gameId: GAME_ID,
        teamId: TEAM_B_ID,
        tileId: 'tile-b',
        status: CivilizationTowerStatus.DESTROYED,
        workKind: null,
        protectionRadius: 0,
        destructionProgressActions: 3,
        destructionRequiredActions: 3,
        constructionStartedAt: FIXED_NOW,
        constructionCompletesAt: null,
        destroyedAt: FIXED_NOW,
        createdByPlayerId: null,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];
    state.teamResources = [
      {
        id: 'resource-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        goldAmount: new Prisma.Decimal(500),
        goldIncomePerHour: new Prisma.Decimal(0),
        lastSettledAt: FIXED_NOW,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];
    const response = createQueryHarness(state).service.toState(state, USER_A_ID, FIXED_NOW);

    expect(response.availableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'CAPTURE_BUILDING',
          buildingId: 'building-neutral',
          targetCoordinate: { q: 0, r: 0 },
          disabledReason: null,
        }),
      ]),
    );
    expect(response.availableActions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'ATTACK_TOWER' })]),
    );
  });

  test('returns tower placement only for adjacent owned connected empty ground', () => {
    const state = createQueryState(CivilizationGameStatus.ACTIVE);
    state.tiles.push({
      id: 'tile-a-adjacent',
      gameId: GAME_ID,
      q: 1,
      r: 0,
      terrainType: CivilizationTerrainType.GROUND,
      ownerTeamId: TEAM_A_ID,
      isConnected: true,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    state.tiles.push({
      id: 'tile-a-remote',
      gameId: GAME_ID,
      q: 2,
      r: 0,
      terrainType: CivilizationTerrainType.GROUND,
      ownerTeamId: TEAM_A_ID,
      isConnected: true,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    state.teamResources = [
      {
        id: 'resource-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        goldAmount: new Prisma.Decimal(500),
        goldIncomePerHour: new Prisma.Decimal(0),
        lastSettledAt: FIXED_NOW,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];
    const response = createQueryHarness(state).service.toState(state, USER_A_ID, FIXED_NOW);

    expect(
      response.availableActions
        .filter((action) => action.type === 'BUILD_TOWER' && action.disabledReason === null)
        .map((action) => action.targetCoordinate),
    ).toEqual([{ q: 1, r: 0 }]);
  });

  test('offers only Catapult against a tower from its configured protection boundary', () => {
    const state = createQueryState(CivilizationGameStatus.ACTIVE);
    state.tiles.push({
      id: 'tile-b-radius-two',
      gameId: GAME_ID,
      q: 2,
      r: -1,
      terrainType: CivilizationTerrainType.GROUND,
      ownerTeamId: TEAM_B_ID,
      isConnected: true,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    state.towers = [
      {
        id: 'tower-b-radius-two',
        gameId: GAME_ID,
        teamId: TEAM_B_ID,
        tileId: 'tile-b-radius-two',
        status: CivilizationTowerStatus.ACTIVE,
        workKind: null,
        protectionRadius: 1,
        destructionProgressActions: 0,
        destructionRequiredActions: 3,
        constructionStartedAt: FIXED_NOW,
        constructionCompletesAt: null,
        destroyedAt: null,
        createdByPlayerId: null,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];
    state.teamResources = [
      {
        id: 'resource-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        goldAmount: new Prisma.Decimal(500),
        goldIncomePerHour: new Prisma.Decimal(0),
        lastSettledAt: FIXED_NOW,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];

    const response = createQueryHarness(state).service.toState(state, USER_A_ID, FIXED_NOW);

    expect(response.availableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'CATAPULT_ATTACK',
          towerId: 'tower-b-radius-two',
          targetCoordinate: { q: 2, r: -1 },
          disabledReason: null,
        }),
      ]),
    );
    expect(response.availableActions).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ type: 'ATTACK_TOWER' })]),
    );
  });

  test('offers Catapult against an enemy tower under construction', () => {
    const state = createQueryState(CivilizationGameStatus.ACTIVE);
    state.tiles.push({
      id: 'construction-tower-tile-b',
      gameId: GAME_ID,
      q: 2,
      r: -1,
      terrainType: CivilizationTerrainType.GROUND,
      ownerTeamId: TEAM_B_ID,
      isConnected: true,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    state.towers = [
      {
        id: 'construction-tower-b',
        gameId: GAME_ID,
        teamId: TEAM_B_ID,
        tileId: 'construction-tower-tile-b',
        status: CivilizationTowerStatus.UNDER_CONSTRUCTION,
        workKind: CivilizationTowerWorkKind.BUILD,
        protectionRadius: 1,
        destructionProgressActions: 0,
        destructionRequiredActions: 3,
        constructionStartedAt: FIXED_NOW,
        constructionCompletesAt: new Date('2026-08-09T13:00:00.000Z'),
        destroyedAt: null,
        createdByPlayerId: null,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];
    state.teamResources = [
      {
        id: 'construction-catapult-resource-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        goldAmount: new Prisma.Decimal(500),
        goldIncomePerHour: new Prisma.Decimal(0),
        lastSettledAt: FIXED_NOW,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];

    const response = createQueryHarness(state).service.toState(state, USER_A_ID, FIXED_NOW);

    expect(response.availableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'CATAPULT_ATTACK',
          towerId: 'construction-tower-b',
          targetCoordinate: { q: 2, r: -1 },
          disabledReason: null,
        }),
      ]),
    );
  });

  test('offers normal movement onto an adjacent enemy tile with a destroyed tower', () => {
    const state = createQueryState(CivilizationGameStatus.ACTIVE);
    state.tiles.push({
      id: 'destroyed-tower-tile',
      gameId: GAME_ID,
      q: 1,
      r: 0,
      terrainType: CivilizationTerrainType.GROUND,
      ownerTeamId: TEAM_B_ID,
      isConnected: false,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    state.towers = [
      {
        id: 'destroyed-tower-b',
        gameId: GAME_ID,
        teamId: TEAM_B_ID,
        tileId: 'destroyed-tower-tile',
        status: CivilizationTowerStatus.DESTROYED,
        workKind: null,
        protectionRadius: 1,
        destructionProgressActions: 3,
        destructionRequiredActions: 3,
        constructionStartedAt: FIXED_NOW,
        constructionCompletesAt: null,
        destroyedAt: FIXED_NOW,
        createdByPlayerId: null,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];

    const response = createQueryHarness(state).service.toState(state, USER_A_ID, FIXED_NOW);

    expect(response.availableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'MOVE',
          targetCoordinate: { q: 1, r: 0 },
          actionPointUnits: defaultCivilizationSettings.costs.otherMoveUnits,
          disabledReason: null,
        }),
      ]),
    );
  });

  test('offers a configured Repair Kit only for an adjacent allied damaged tower', () => {
    const state = createQueryState(CivilizationGameStatus.ACTIVE);
    const settings = structuredClone(defaultCivilizationSettings);
    settings.repairKit.goldPrice = '95';
    settings.repairKit.repairActions = 2;
    state.settingsJson = settings;
    state.tiles.push({
      id: 'damaged-tower-tile',
      gameId: GAME_ID,
      q: 1,
      r: 0,
      terrainType: CivilizationTerrainType.GROUND,
      ownerTeamId: TEAM_A_ID,
      isConnected: true,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    state.towers = [
      {
        id: 'damaged-tower-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        tileId: 'damaged-tower-tile',
        status: CivilizationTowerStatus.ACTIVE,
        workKind: null,
        protectionRadius: 1,
        destructionProgressActions: 2,
        destructionRequiredActions: 3,
        constructionStartedAt: FIXED_NOW,
        constructionCompletesAt: null,
        destroyedAt: null,
        createdByPlayerId: null,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];
    state.teamResources = [
      {
        id: 'resource-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        goldAmount: new Prisma.Decimal(500),
        goldIncomePerHour: new Prisma.Decimal(0),
        lastSettledAt: FIXED_NOW,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];

    const response = createQueryHarness(state).service.toState(state, USER_A_ID, FIXED_NOW);

    expect(response.availableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'REPAIR_TOWER',
          towerId: 'damaged-tower-a',
          targetCoordinate: { q: 1, r: 0 },
          goldCost: '95',
          disabledReason: null,
        }),
      ]),
    );
    expect(response.game.settings.repairKit.repairActions).toBe(2);
  });

  test('offers Repair Kit for an adjacent allied town hall with hostile capture progress', () => {
    const state = createQueryState(CivilizationGameStatus.ACTIVE);
    state.tiles.push({
      id: 'damaged-town-hall-tile',
      gameId: GAME_ID,
      q: 1,
      r: 0,
      terrainType: CivilizationTerrainType.GROUND,
      ownerTeamId: TEAM_A_ID,
      isConnected: true,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    state.buildings = [
      {
        id: 'damaged-town-hall-a',
        gameId: GAME_ID,
        tileId: 'damaged-town-hall-tile',
        buildingType: CivilizationBuildingType.TOWN_HALL,
        attributeKey: null,
        ownerTeamId: TEAM_A_ID,
        captureTeamId: TEAM_B_ID,
        captureProgressUnits: 3,
        captureRequiredUnits: 16,
        incomePerHour: new Prisma.Decimal(0),
        status: CivilizationBuildingStatus.ACTIVE,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];
    state.teamResources = [
      {
        id: 'repair-town-hall-resource-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        goldAmount: new Prisma.Decimal(500),
        goldIncomePerHour: new Prisma.Decimal(0),
        lastSettledAt: FIXED_NOW,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];

    const response = createQueryHarness(state).service.toState(state, USER_A_ID, FIXED_NOW);

    expect(response.availableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'REPAIR_TOWER',
          buildingId: 'damaged-town-hall-a',
          targetCoordinate: { q: 1, r: 0 },
          goldCost: defaultCivilizationSettings.repairKit.goldPrice,
          disabledReason: null,
        }),
      ]),
    );
    expect(response.availableActions.some((action) => action.type === 'DEFEND_TOWN_HALL')).toBe(
      false,
    );
  });

  test('offers Repair Kit for an adjacent allied resource building under attack', () => {
    const state = createQueryState(CivilizationGameStatus.ACTIVE);
    state.tiles.push({
      id: 'damaged-resource-building-tile',
      gameId: GAME_ID,
      q: 1,
      r: 0,
      terrainType: CivilizationTerrainType.GROUND,
      ownerTeamId: TEAM_A_ID,
      isConnected: true,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    state.buildings = [
      {
        id: 'damaged-resource-building-a',
        gameId: GAME_ID,
        tileId: 'damaged-resource-building-tile',
        buildingType: CivilizationBuildingType.GOLD_BUILDING,
        attributeKey: null,
        ownerTeamId: TEAM_A_ID,
        captureTeamId: TEAM_B_ID,
        captureProgressUnits: 3,
        captureRequiredUnits: 6,
        incomePerHour: new Prisma.Decimal(25),
        status: CivilizationBuildingStatus.ACTIVE,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];
    state.teamResources = [
      {
        id: 'repair-resource-building-gold-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        goldAmount: new Prisma.Decimal(500),
        goldIncomePerHour: new Prisma.Decimal(0),
        lastSettledAt: FIXED_NOW,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];

    const response = createQueryHarness(state).service.toState(state, USER_A_ID, FIXED_NOW);

    expect(response.availableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'REPAIR_TOWER',
          buildingId: 'damaged-resource-building-a',
          targetCoordinate: { q: 1, r: 0 },
          disabledReason: null,
        }),
      ]),
    );
  });

  test("marks movement onto another team's spawn as unavailable", () => {
    const state = createQueryState(CivilizationGameStatus.ACTIVE);
    state.tiles.push({
      id: 'team-b-spawn',
      gameId: GAME_ID,
      q: 1,
      r: 0,
      terrainType: CivilizationTerrainType.GROUND,
      ownerTeamId: TEAM_B_ID,
      isConnected: true,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    state.spawnPoints.push({
      id: 'spawn-team-b',
      gameId: GAME_ID,
      teamId: TEAM_B_ID,
      tileId: 'team-b-spawn',
      createdAt: FIXED_NOW,
    });

    const response = createQueryHarness(state).service.toState(state, USER_A_ID, FIXED_NOW);

    expect(response.availableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'MOVE',
          targetCoordinate: { q: 1, r: 0 },
          disabledReason: CIVILIZATION_ERROR_CODES.TILE_OCCUPIED_BY_ENEMY,
        }),
      ]),
    );
  });

  test('offers only Catapult against an adjacent enemy town hall', () => {
    const state = createQueryState(CivilizationGameStatus.ACTIVE);
    state.tiles.push({
      id: 'town-hall-tile-b',
      gameId: GAME_ID,
      q: 1,
      r: 0,
      terrainType: CivilizationTerrainType.GROUND,
      ownerTeamId: TEAM_B_ID,
      isConnected: false,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    state.buildings = [
      {
        id: 'town-hall-b',
        gameId: GAME_ID,
        tileId: 'town-hall-tile-b',
        buildingType: CivilizationBuildingType.TOWN_HALL,
        attributeKey: null,
        ownerTeamId: TEAM_B_ID,
        captureTeamId: null,
        captureProgressUnits: 0,
        captureRequiredUnits: 16,
        incomePerHour: new Prisma.Decimal(0),
        status: CivilizationBuildingStatus.ACTIVE,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];
    state.teamResources = [
      {
        id: 'town-hall-catapult-resource-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        goldAmount: new Prisma.Decimal(500),
        goldIncomePerHour: new Prisma.Decimal(0),
        lastSettledAt: FIXED_NOW,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];
    const response = createQueryHarness(state).service.toState(state, USER_A_ID, FIXED_NOW);

    expect(response.availableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'CATAPULT_ATTACK',
          buildingId: 'town-hall-b',
          targetCoordinate: { q: 1, r: 0 },
          actionPointUnits: defaultCivilizationSettings.catapult.actionPointUnits,
          goldCost: defaultCivilizationSettings.catapult.goldPrice,
          disabledReason: null,
        }),
      ]),
    );
    expect(
      response.availableActions.some(
        (action) =>
          action.type === 'CAPTURE_TOWN_HALL' && action.buildingId === 'town-hall-b',
      ),
    ).toBe(false);
    expect(
      response.availableActions.some(
        (action) => action.type === 'MOVE' && action.targetCoordinate?.q === 1,
      ),
    ).toBe(false);
  });

  test('offers adjacent resource-building capture instead of movement', () => {
    const state = createQueryState(CivilizationGameStatus.ACTIVE);
    state.tiles.push({
      id: 'resource-building-tile',
      gameId: GAME_ID,
      q: 1,
      r: 0,
      terrainType: CivilizationTerrainType.GROUND,
      ownerTeamId: TEAM_B_ID,
      isConnected: false,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    state.buildings = [
      {
        id: 'resource-building-b',
        gameId: GAME_ID,
        tileId: 'resource-building-tile',
        buildingType: CivilizationBuildingType.GOLD_BUILDING,
        attributeKey: null,
        ownerTeamId: TEAM_B_ID,
        captureTeamId: null,
        captureProgressUnits: 0,
        captureRequiredUnits: 6,
        incomePerHour: new Prisma.Decimal(25),
        status: CivilizationBuildingStatus.ACTIVE,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];
    state.teamResources = [
      {
        id: 'resource-building-catapult-gold-a',
        gameId: GAME_ID,
        teamId: TEAM_A_ID,
        goldAmount: new Prisma.Decimal(500),
        goldIncomePerHour: new Prisma.Decimal(0),
        lastSettledAt: FIXED_NOW,
        createdAt: FIXED_NOW,
        updatedAt: FIXED_NOW,
      },
    ];
    const response = createQueryHarness(state).service.toState(state, USER_A_ID, FIXED_NOW);

    expect(response.availableActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'CAPTURE_BUILDING',
          buildingId: 'resource-building-b',
          targetCoordinate: { q: 1, r: 0 },
          disabledReason: null,
        }),
        expect.objectContaining({
          type: 'CATAPULT_ATTACK',
          buildingId: 'resource-building-b',
          targetCoordinate: { q: 1, r: 0 },
          disabledReason: null,
        }),
      ]),
    );
    expect(
      response.availableActions.some(
        (action) => action.type === 'MOVE' && action.targetCoordinate?.q === 1,
      ),
    ).toBe(false);
  });
});
