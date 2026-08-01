import { describe, expect, test } from 'bun:test';

import { CivilizationConfigurationService } from '../src/modules/civilization/civilization-configuration.service';
import { defaultCivilizationSettings } from '../src/modules/civilization/domain';
import type { CreateCivilizationGameDto } from '../src/modules/civilization/dto';

const PLAYER_A_ID = '00000000-0000-4000-8000-0000000000a1';
const PLAYER_B_ID = '00000000-0000-4000-8000-0000000000b1';

function createValidConfiguration(): CreateCivilizationGameDto {
  return {
    name: 'Validated Civilization',
    startAt: '2026-08-01T00:00:00.000Z',
    endAt: '2026-08-08T00:00:00.000Z',
    settings: structuredClone(defaultCivilizationSettings),
    teams: [
      {
        side: 'TEAM_A',
        name: 'Amber',
        color: '#f59e0b',
        visualKey: 'amber',
        playerIds: [PLAYER_A_ID],
      },
      {
        side: 'TEAM_B',
        name: 'Azure',
        color: '#0284c7',
        visualKey: 'azure',
        playerIds: [PLAYER_B_ID],
      },
    ],
    map: {
      tiles: [
        { q: -2, r: 0, terrainType: 'GROUND', ownerTeamSide: 'TEAM_A' },
        { q: -1, r: 0, terrainType: 'GROUND', ownerTeamSide: 'TEAM_A' },
        { q: 0, r: 0, terrainType: 'GROUND', ownerTeamSide: null },
        { q: 1, r: 0, terrainType: 'GROUND', ownerTeamSide: 'TEAM_B' },
        { q: 2, r: 0, terrainType: 'GROUND', ownerTeamSide: 'TEAM_B' },
        { q: 2, r: -1, terrainType: 'GROUND', ownerTeamSide: 'TEAM_B' },
      ],
      spawn: { q: 0, r: 0 },
      buildings: [
        { q: -2, r: 0, type: 'TOWN_HALL', ownerTeamSide: 'TEAM_A' },
        { q: 2, r: 0, type: 'TOWN_HALL', ownerTeamSide: 'TEAM_B' },
      ],
      towers: [],
    },
  };
}

function issueCodes(input: CreateCivilizationGameDto): string[] {
  return new CivilizationConfigurationService().validate(input).issues.map((issue) => issue.code);
}

describe('Civilization configuration validation', () => {
  test('accepts a complete deterministic two-team configuration', () => {
    const result = new CivilizationConfigurationService().validate(createValidConfiguration());

    expect(result).toEqual({ valid: true, issues: [] });
  });

  test('accepts radius-one tower centers exactly three hexes apart', () => {
    const input = createValidConfiguration();
    input.map.towers = [
      { q: -1, r: 0, teamSide: 'TEAM_A', protectionRadius: 1 },
      { q: 2, r: -1, teamSide: 'TEAM_B', protectionRadius: 1 },
    ];

    expect(issueCodes(input)).not.toContain('TOWER_RADIUS_OVERLAP');
  });

  test('rejects overlapping tower protection at axial distance two', () => {
    const input = createValidConfiguration();
    input.map.towers = [
      { q: -1, r: 0, teamSide: 'TEAM_A', protectionRadius: 1 },
      { q: 1, r: 0, teamSide: 'TEAM_B', protectionRadius: 1 },
    ];

    expect(issueCodes(input)).toContain('TOWER_RADIUS_OVERLAP');
  });

  test('rejects a player assigned to both teams', () => {
    const input = createValidConfiguration();
    input.teams[1]!.playerIds = [PLAYER_A_ID];

    const codes = issueCodes(input);
    expect(codes).toContain('PLAYER_ASSIGNED_TWICE');
  });

  test('rejects a town hall whose tile is not owned by its team', () => {
    const input = createValidConfiguration();
    input.map.tiles.find((tile) => tile.q === -2 && tile.r === 0)!.ownerTeamSide = 'TEAM_B';

    expect(issueCodes(input)).toContain('TOWN_HALL_TILE_NOT_OWNED');
  });

  test('rejects a building on the shared spawn', () => {
    const input = createValidConfiguration();
    input.map.spawn = { q: -2, r: 0 };

    expect(issueCodes(input)).toContain('SPAWN_OBJECT_COLLISION');
  });

  test('rejects map objects on mountains and mountains with owners', () => {
    const input = createValidConfiguration();
    const sharedSpawn = input.map.tiles.find((tile) => tile.q === 0 && tile.r === 0)!;
    sharedSpawn.terrainType = 'MOUNTAIN';
    sharedSpawn.ownerTeamSide = 'TEAM_A';

    const codes = issueCodes(input);
    expect(codes).toContain('MOUNTAIN_HAS_OWNER');
    expect(codes).toContain('OBJECT_ON_MOUNTAIN');
  });

  test('rejects invalid dates and settings in one validation result', () => {
    const input = createValidConfiguration();
    input.endAt = input.startAt;
    input.settings = {
      ...structuredClone(defaultCivilizationSettings),
      combat: { attackerWinPercent: 60, defenderWinPercent: 60 },
    };

    const codes = issueCodes(input);
    expect(codes).toContain('INVALID_DATE_RANGE');
    expect(codes).toContain('INVALID_SETTINGS');
  });

  test('uses axial distance, not separate coordinate bounds, for map radius', () => {
    const boundary = createValidConfiguration();
    boundary.map.tiles.find((tile) => tile.q === 0 && tile.r === 0)!.q = 25;
    boundary.map.tiles.find((tile) => tile.q === 25 && tile.r === 0)!.r = -25;
    expect(issueCodes(boundary)).not.toContain('COORDINATE_OUT_OF_RANGE');

    const outside = createValidConfiguration();
    outside.map.tiles.find((tile) => tile.q === 0 && tile.r === 0)!.q = 25;
    outside.map.tiles.find((tile) => tile.q === 25 && tile.r === 0)!.r = 25;
    expect(issueCodes(outside)).toContain('COORDINATE_OUT_OF_RANGE');
  });
});
