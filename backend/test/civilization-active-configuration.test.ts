import { describe, expect, test } from 'bun:test';
import {
  CivilizationBuildingStatus,
  CivilizationBuildingType,
  CivilizationTeamSide,
  CivilizationTerrainType,
} from '@prisma/client';

import { PrismaService } from '../src/database/prisma/prisma.service';
import { defaultCivilizationSettings } from '../src/modules/civilization/domain';
import {
  CivilizationRepository,
  type CivilizationStateRecord,
  type CivilizationTransaction,
  type ReplaceCivilizationConfigurationInput,
} from '../src/modules/civilization/repositories';

const GAME_ID = '00000000-0000-4000-8000-000000000101';
const TEAM_A_ID = '00000000-0000-4000-8000-00000000010a';
const TEAM_B_ID = '00000000-0000-4000-8000-00000000010b';
const TILE_ID = '00000000-0000-4000-8000-000000001101';
const BUILDING_ID = '00000000-0000-4000-8000-000000001201';

describe('Civilization active configuration replacement', () => {
  test('preserves compatible in-progress building capture state', async () => {
    const createdBuildingData: Array<Record<string, unknown>> = [];
    const current = {
      id: GAME_ID,
      teams: [
        { id: TEAM_A_ID, side: CivilizationTeamSide.TEAM_A },
        { id: TEAM_B_ID, side: CivilizationTeamSide.TEAM_B },
      ],
      players: [],
      tiles: [
        {
          id: TILE_ID,
          q: 0,
          r: 0,
          terrainType: CivilizationTerrainType.GROUND,
        },
      ],
      buildings: [
        {
          id: BUILDING_ID,
          buildingType: CivilizationBuildingType.GOLD_BUILDING,
          attributeKey: null,
          ownerTeamId: null,
          captureTeamId: TEAM_A_ID,
          captureProgressUnits: 4,
          captureRequiredUnits: 6,
          status: CivilizationBuildingStatus.ACTIVE,
        },
      ],
      towers: [],
    } as unknown as CivilizationStateRecord;
    const repository = new CivilizationRepository({} as PrismaService);
    repository.findStateById = (async () => current) as typeof repository.findStateById;

    const tx = {
      civilizationGame: { update: async () => ({}) },
      civilizationTeam: {
        update: async ({ where }: { where: { id: string } }) => ({ id: where.id }),
        updateMany: async () => ({ count: 2 }),
      },
      civilizationTile: {
        update: async ({ where, data }: { where: { id: string }; data: { terrainType: string } }) =>
          ({ id: where.id, terrainType: data.terrainType }),
        create: async () => {
          throw new Error('The retained tile must be updated, not created');
        },
        deleteMany: async () => ({ count: 0 }),
      },
      civilizationGamePlayer: {
        update: async () => ({}),
        create: async () => ({}),
      },
      civilizationTower: {
        deleteMany: async () => ({ count: 0 }),
        create: async () => ({}),
      },
      civilizationBuilding: {
        deleteMany: async () => ({ count: 1 }),
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdBuildingData.push(data);
          return { tileId: data.tileId };
        },
      },
      civilizationSpawnPoint: {
        deleteMany: async () => ({ count: 0 }),
        create: async () => ({}),
      },
    } as unknown as CivilizationTransaction;
    const input: ReplaceCivilizationConfigurationInput = {
      name: 'Active game',
      startAt: new Date('2026-08-01T00:00:00.000Z'),
      endAt: new Date('2026-08-08T00:00:00.000Z'),
      teams: [
        {
          side: CivilizationTeamSide.TEAM_A,
          name: 'Blue',
          color: '#4f7cff',
          visualKey: 'blue',
          playerIds: [],
        },
        {
          side: CivilizationTeamSide.TEAM_B,
          name: 'Red',
          color: '#ef476f',
          visualKey: 'red',
          playerIds: [],
        },
      ],
      map: {
        tiles: [{ q: 0, r: 0, terrainType: CivilizationTerrainType.GROUND }],
        spawns: [
          { q: 0, r: 0, teamSide: CivilizationTeamSide.TEAM_A },
          { q: 0, r: 0, teamSide: CivilizationTeamSide.TEAM_B },
        ],
        buildings: [
          {
            id: BUILDING_ID,
            q: 0,
            r: 0,
            type: CivilizationBuildingType.GOLD_BUILDING,
            ownerTeamSide: null,
            captureRequiredUnits: 6,
            incomePerHour: '25',
          },
        ],
        towers: [],
      },
      settings: structuredClone(defaultCivilizationSettings),
    };

    await repository.replaceActiveConfiguration(
      GAME_ID,
      input,
      new Date('2026-08-04T12:00:00.000Z'),
      tx,
    );

    expect(createdBuildingData).toHaveLength(1);
    expect(createdBuildingData[0]).toMatchObject({
      id: BUILDING_ID,
      captureTeamId: TEAM_A_ID,
      captureProgressUnits: 4,
      captureRequiredUnits: 6,
    });
  });
});
