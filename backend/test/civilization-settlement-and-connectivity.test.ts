import { describe, expect, test } from 'bun:test';
import {
  CivilizationAttributeKey,
  CivilizationBuildingStatus,
  CivilizationBuildingType,
  CivilizationEventType,
  CivilizationGameStatus,
  CivilizationTerrainType,
  Prisma,
} from '@prisma/client';

import { CivilizationConnectivityService } from '../src/modules/civilization/civilization-connectivity.service';
import { CivilizationSettlementService } from '../src/modules/civilization/civilization-settlement.service';
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
const START = new Date('2026-08-01T00:00:00.000Z');

describe('Civilization settlement service', () => {
  test('lazily regenerates AP in half-point units and persists the settled timestamp', async () => {
    const updates: Array<{ playerId: string; data: Record<string, unknown> }> = [];
    const repository = {
      async updatePlayer(playerId: string, data: Record<string, unknown>): Promise<void> {
        updates.push({ playerId, data });
      },
    };
    const service = new CivilizationSettlementService(
      repository as unknown as CivilizationRepository,
    );
    const player = {
      id: 'player-a',
      actionPointUnits: 4,
      lastActionPointUpdateAt: START,
    } as CivilizationStateRecord['players'][number];

    const settlement = await service.settlePlayer(
      player,
      structuredClone(defaultCivilizationSettings),
      new Date('2026-08-01T07:00:00.000Z'),
      {} as CivilizationTransaction,
    );

    expect(settlement).toEqual({
      actionPointUnits: 8,
      regeneratedUnits: 4,
      elapsedIntervals: 2,
      lastActionPointUpdateAt: new Date('2026-08-01T06:00:00.000Z'),
      nextRegenerationAt: new Date('2026-08-01T09:00:00.000Z'),
    });
    expect(updates).toEqual([
      {
        playerId: 'player-a',
        data: {
          actionPointUnits: 8,
          lastActionPointUpdateAt: new Date('2026-08-01T06:00:00.000Z'),
        },
      },
    ]);
  });

  test('caps AP and discards old regeneration time once the player is full', async () => {
    const updates: Array<{ playerId: string; data: Record<string, unknown> }> = [];
    const repository = {
      async updatePlayer(playerId: string, data: Record<string, unknown>): Promise<void> {
        updates.push({ playerId, data });
      },
    };
    const service = new CivilizationSettlementService(
      repository as unknown as CivilizationRepository,
    );
    const now = new Date('2026-08-03T00:00:00.000Z');
    const player = {
      id: 'player-a',
      actionPointUnits: 15,
      lastActionPointUpdateAt: START,
    } as CivilizationStateRecord['players'][number];

    const settlement = await service.settlePlayer(
      player,
      structuredClone(defaultCivilizationSettings),
      now,
      {} as CivilizationTransaction,
    );

    expect(settlement.actionPointUnits).toBe(16);
    expect(settlement.regeneratedUnits).toBe(1);
    expect(settlement.lastActionPointUpdateAt).toEqual(now);
    expect(settlement.nextRegenerationAt).toBeNull();
    expect(updates[0]?.data).toMatchObject({
      actionPointUnits: 16,
      lastActionPointUpdateAt: now,
    });
  });

  test('settles gold and endurance only through the configured game end time', async () => {
    const teamResourceUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];
    const attributeUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];
    const events: CivilizationEventInput[] = [];
    const repository = {
      async updateTeamResource(id: string, data: Record<string, unknown>): Promise<void> {
        teamResourceUpdates.push({ id, data });
      },
      async updateAttributeResource(id: string, data: Record<string, unknown>): Promise<void> {
        attributeUpdates.push({ id, data });
      },
      async createEvent(input: CivilizationEventInput): Promise<void> {
        events.push(input);
      },
    };
    const service = new CivilizationSettlementService(
      repository as unknown as CivilizationRepository,
    );
    const state = {
      id: GAME_ID,
      status: CivilizationGameStatus.ACTIVE,
      endAt: new Date('2026-08-01T04:00:00.000Z'),
      teamResources: [
        {
          id: 'gold-a',
          teamId: TEAM_A_ID,
          goldAmount: new Prisma.Decimal(10),
          goldIncomePerHour: new Prisma.Decimal(5),
          lastSettledAt: START,
        },
      ],
      attributeResources: [
        {
          id: 'endurance-a',
          teamId: TEAM_A_ID,
          attributeKey: CivilizationAttributeKey.endurance,
          amount: new Prisma.Decimal(0),
          incomePerHour: new Prisma.Decimal(1),
          lastSettledAt: START,
        },
      ],
    } as CivilizationStateRecord;

    await service.settleAllResources(
      state,
      new Date('2026-08-01T06:00:00.000Z'),
      {} as CivilizationTransaction,
    );

    expect(teamResourceUpdates).toEqual([
      {
        id: 'gold-a',
        data: {
          goldAmount: '30',
          lastSettledAt: new Date('2026-08-01T04:00:00.000Z'),
        },
      },
    ]);
    expect(attributeUpdates).toEqual([
      {
        id: 'endurance-a',
        data: {
          amount: '4',
          lastSettledAt: new Date('2026-08-01T04:00:00.000Z'),
        },
      },
    ]);
    expect(events.map((event) => event.eventType)).toEqual([
      CivilizationEventType.GOLD_ACCRUED,
      CivilizationEventType.ATTRIBUTE_ACCRUED,
    ]);
  });

  test('does not accrue resources for a completed historical game', async () => {
    let updateCount = 0;
    const repository = {
      async updateTeamResource(): Promise<void> {
        updateCount += 1;
      },
      async updateAttributeResource(): Promise<void> {
        updateCount += 1;
      },
    };
    const service = new CivilizationSettlementService(
      repository as unknown as CivilizationRepository,
    );

    await service.settleAllResources(
      {
        status: CivilizationGameStatus.COMPLETED,
        teamResources: [{ id: 'resource-that-must-not-settle' }],
        attributeResources: [{ id: 'attribute-that-must-not-settle' }],
      } as CivilizationStateRecord,
      new Date('2026-08-02T00:00:00.000Z'),
      {} as CivilizationTransaction,
    );

    expect(updateCount).toBe(0);
  });
});

describe('Civilization connectivity service', () => {
  test('settles old rates first, then excludes disconnected territory and buildings from production', async () => {
    const state = createConnectivityState();
    const operationOrder: string[] = [];
    const tileUpdates = new Map<string, boolean>();
    const goldIncomeUpdates = new Map<string, string>();
    const attributeIncomeUpdates = new Map<string, string>();
    const repository = {
      async findStateById(): Promise<CivilizationStateRecord> {
        return state;
      },
      async updateTile(id: string, data: Record<string, unknown>): Promise<void> {
        operationOrder.push(`tile:${id}`);
        tileUpdates.set(id, data.isConnected as boolean);
      },
      async updateTeamResource(id: string, data: Record<string, unknown>): Promise<void> {
        operationOrder.push(`gold:${id}`);
        goldIncomeUpdates.set(id, String(data.goldIncomePerHour));
      },
      async updateAttributeResource(id: string, data: Record<string, unknown>): Promise<void> {
        operationOrder.push(`attribute:${id}`);
        attributeIncomeUpdates.set(id, String(data.incomePerHour));
      },
      async updateGame(): Promise<void> {
        operationOrder.push('game-version');
      },
    };
    const settlement = {
      async settleAllResources(): Promise<void> {
        operationOrder.push('settle-old-rates');
      },
    };
    const service = new CivilizationConnectivityService(
      repository as unknown as CivilizationRepository,
      settlement as unknown as CivilizationSettlementService,
    );

    await service.recalculate(
      GAME_ID,
      new Date('2026-08-01T03:00:00.000Z'),
      {} as CivilizationTransaction,
    );

    expect(operationOrder[0]).toBe('settle-old-rates');
    expect(tileUpdates.get('a-town')).toBe(true);
    expect(tileUpdates.get('a-ordinary')).toBe(true);
    expect(tileUpdates.get('a-gold')).toBe(true);
    expect(tileUpdates.get('a-endurance')).toBe(true);
    expect(tileUpdates.has('a-disconnected-strength')).toBe(false);
    expect(goldIncomeUpdates.get('gold-a')).toBe('30');
    expect(goldIncomeUpdates.get('gold-b')).toBe('5');
    expect(attributeIncomeUpdates.get('attribute-a-endurance')).toBe('1.5');
    expect(attributeIncomeUpdates.get('attribute-a-strength')).toBe('0');
  });
});

function createConnectivityState(): CivilizationStateRecord {
  const tiles = [
    connectivityTile('a-town', 0, 0, TEAM_A_ID),
    connectivityTile('a-ordinary', 1, 0, TEAM_A_ID),
    connectivityTile('a-gold', 0, 1, TEAM_A_ID),
    connectivityTile('a-endurance', 1, -1, TEAM_A_ID),
    connectivityTile('gap', 2, 0, null),
    connectivityTile('a-disconnected-strength', 3, 0, TEAM_A_ID),
    connectivityTile('b-ordinary', 4, 0, TEAM_B_ID),
    connectivityTile('b-town', 5, 0, TEAM_B_ID),
  ];
  const buildings = [
    connectivityBuilding('town-a', 'a-town', CivilizationBuildingType.TOWN_HALL, TEAM_A_ID, '0'),
    connectivityBuilding(
      'gold-building-a',
      'a-gold',
      CivilizationBuildingType.GOLD_BUILDING,
      TEAM_A_ID,
      '25',
    ),
    {
      ...connectivityBuilding(
        'endurance-building-a',
        'a-endurance',
        CivilizationBuildingType.ATTRIBUTE_BUILDING,
        TEAM_A_ID,
        '1.5',
      ),
      attributeKey: CivilizationAttributeKey.endurance,
    },
    {
      ...connectivityBuilding(
        'strength-building-a-disconnected',
        'a-disconnected-strength',
        CivilizationBuildingType.ATTRIBUTE_BUILDING,
        TEAM_A_ID,
        '9',
      ),
      attributeKey: CivilizationAttributeKey.strength,
    },
    connectivityBuilding('town-b', 'b-town', CivilizationBuildingType.TOWN_HALL, TEAM_B_ID, '0'),
  ];
  const attributeResources = Object.values(CivilizationAttributeKey).flatMap((attributeKey) => [
    connectivityAttributeResource(`attribute-a-${attributeKey}`, TEAM_A_ID, attributeKey),
    connectivityAttributeResource(`attribute-b-${attributeKey}`, TEAM_B_ID, attributeKey),
  ]);

  return {
    id: GAME_ID,
    settingsJson: structuredClone(defaultCivilizationSettings),
    teams: [
      { id: TEAM_A_ID, townHallTileId: 'a-town' },
      { id: TEAM_B_ID, townHallTileId: 'b-town' },
    ],
    tiles,
    buildings,
    teamResources: [
      { id: 'gold-a', teamId: TEAM_A_ID },
      { id: 'gold-b', teamId: TEAM_B_ID },
    ],
    attributeResources,
  } as unknown as CivilizationStateRecord;
}

function connectivityTile(
  id: string,
  q: number,
  r: number,
  ownerTeamId: string | null,
): CivilizationStateRecord['tiles'][number] {
  return {
    id,
    gameId: GAME_ID,
    q,
    r,
    terrainType: CivilizationTerrainType.GROUND,
    ownerTeamId,
    isConnected: false,
    createdAt: START,
    updatedAt: START,
  };
}

function connectivityBuilding(
  id: string,
  tileId: string,
  buildingType: CivilizationBuildingType,
  ownerTeamId: string,
  incomePerHour: string,
): CivilizationStateRecord['buildings'][number] {
  return {
    id,
    gameId: GAME_ID,
    tileId,
    buildingType,
    attributeKey: null,
    ownerTeamId,
    captureTeamId: null,
    captureProgressUnits: 0,
    captureRequiredUnits: 6,
    incomePerHour: new Prisma.Decimal(incomePerHour),
    status: CivilizationBuildingStatus.ACTIVE,
    createdAt: START,
    updatedAt: START,
  };
}

function connectivityAttributeResource(
  id: string,
  teamId: string,
  attributeKey: CivilizationAttributeKey,
): CivilizationStateRecord['attributeResources'][number] {
  return {
    id,
    gameId: GAME_ID,
    teamId,
    attributeKey,
    amount: new Prisma.Decimal(0),
    incomePerHour: new Prisma.Decimal(0),
    lastSettledAt: START,
    createdAt: START,
    updatedAt: START,
  };
}
