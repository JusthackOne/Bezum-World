import { Injectable } from '@nestjs/common';

import { findConnectedTerritory, hexKey, parseCivilizationSettings } from './domain';
import type {
  CivilizationBuildingInputDto,
  CivilizationMapInputDto,
  CivilizationTeamInputDto,
  CreateCivilizationGameDto,
} from './dto';

export interface CivilizationConfigurationIssue {
  code: string;
  message: string;
  path: string;
}

export interface CivilizationConfigurationValidation {
  valid: boolean;
  issues: CivilizationConfigurationIssue[];
}

type Coordinate = { q: number; r: number };

@Injectable()
export class CivilizationConfigurationService {
  validate(input: CreateCivilizationGameDto): CivilizationConfigurationValidation {
    const issues: CivilizationConfigurationIssue[] = [];
    const startAt = new Date(input.startAt);
    const endAt = new Date(input.endAt);
    let defaultTowerProtectionRadius = 1;

    if (endAt.getTime() <= startAt.getTime()) {
      this.issue(issues, 'INVALID_DATE_RANGE', 'End date must be after start date', 'endAt');
    }

    try {
      defaultTowerProtectionRadius = parseCivilizationSettings(input.settings).tower
        .protectionRadius;
    } catch (error) {
      this.issue(
        issues,
        'INVALID_SETTINGS',
        error instanceof Error ? error.message : 'Civilization settings are invalid',
        'settings',
      );
    }

    this.validateTeams(input.teams, issues);
    this.validateMap(input.teams, input.map, defaultTowerProtectionRadius, issues);

    return { valid: issues.length === 0, issues };
  }

  private validateTeams(
    teams: CivilizationTeamInputDto[],
    issues: CivilizationConfigurationIssue[],
  ): void {
    const sides = new Set(teams.map((team) => team.side));
    if (sides.size !== 2 || !sides.has('TEAM_A') || !sides.has('TEAM_B')) {
      this.issue(
        issues,
        'INVALID_TEAMS',
        'Exactly one TEAM_A and one TEAM_B are required',
        'teams',
      );
    }

    const assignedUsers = new Set<string>();
    for (const [teamIndex, team] of teams.entries()) {
      for (const userId of team.playerIds) {
        if (assignedUsers.has(userId)) {
          this.issue(
            issues,
            'PLAYER_ASSIGNED_TWICE',
            'A player cannot belong to both teams',
            `teams.${teamIndex}.playerIds`,
          );
        }
        assignedUsers.add(userId);
      }
    }
  }

  private validateMap(
    teams: CivilizationTeamInputDto[],
    map: CivilizationMapInputDto,
    defaultTowerProtectionRadius: number,
    issues: CivilizationConfigurationIssue[],
  ): void {
    const tilesByCoordinate = new Map<string, (typeof map.tiles)[number]>();

    for (const [index, tile] of map.tiles.entries()) {
      const key = this.coordinateKey(tile);
      if (this.hexDistance({ q: 0, r: 0 }, tile) > 25) {
        this.issue(
          issues,
          'COORDINATE_OUT_OF_RANGE',
          'Playable tiles must be within hex radius 25',
          `map.tiles.${index}`,
        );
      }
      if (tilesByCoordinate.has(key)) {
        this.issue(
          issues,
          'DUPLICATE_TILE',
          'Playable tile coordinates must be unique',
          `map.tiles.${index}`,
        );
      }
      tilesByCoordinate.set(key, tile);

      if (tile.terrainType === 'MOUNTAIN' && tile.ownerTeamSide) {
        this.issue(
          issues,
          'MOUNTAIN_HAS_OWNER',
          'Mountain tiles cannot be owned',
          `map.tiles.${index}.ownerTeamSide`,
        );
      }
    }

    const occupiedBuildingCoordinates = new Set<string>();
    for (const [index, building] of map.buildings.entries()) {
      this.validateObjectTile(building, tilesByCoordinate, issues, `map.buildings.${index}`);
      const key = this.coordinateKey(building);
      const buildingTile = tilesByCoordinate.get(key);
      if (building.ownerTeamSide && buildingTile?.ownerTeamSide !== building.ownerTeamSide) {
        this.issue(
          issues,
          'BUILDING_TILE_OWNER_MISMATCH',
          'An owned building tile must have the same team owner',
          `map.buildings.${index}.ownerTeamSide`,
        );
      }
      if (occupiedBuildingCoordinates.has(key)) {
        this.issue(
          issues,
          'BUILDING_TILE_COLLISION',
          'Only one building may occupy a tile',
          `map.buildings.${index}`,
        );
      }
      occupiedBuildingCoordinates.add(key);

      if (building.type === 'ATTRIBUTE_BUILDING' && !building.attributeKey) {
        this.issue(
          issues,
          'ATTRIBUTE_KEY_REQUIRED',
          'Attribute buildings require an attribute key',
          `map.buildings.${index}.attributeKey`,
        );
      }
      if (building.type !== 'ATTRIBUTE_BUILDING' && building.attributeKey) {
        this.issue(
          issues,
          'ATTRIBUTE_KEY_NOT_ALLOWED',
          'Only attribute buildings may define an attribute key',
          `map.buildings.${index}.attributeKey`,
        );
      }
      if (
        building.type === 'TOWN_HALL' &&
        building.incomePerHour !== undefined &&
        !/^0(?:\.0+)?$/.test(building.incomePerHour)
      ) {
        this.issue(
          issues,
          'TOWN_HALL_INCOME_NOT_ALLOWED',
          'Town halls cannot produce resource income',
          `map.buildings.${index}.incomePerHour`,
        );
      }
    }

    const allTownHalls = map.buildings.filter((building) => building.type === 'TOWN_HALL');
    if (allTownHalls.length !== 2) {
      this.issue(
        issues,
        'INVALID_TOWN_HALL_COUNT',
        'Exactly two town halls are required in total',
        'map.buildings',
      );
    }

    const connectivityTiles = map.tiles.map((tile) => ({
      q: tile.q,
      r: tile.r,
      ownerTeamId: tile.ownerTeamSide ?? null,
      isPassable: tile.terrainType !== 'MOUNTAIN',
    }));
    const connectedKeysBySide = new Map<string, Set<string>>();
    for (const team of teams) {
      const townHalls = map.buildings.filter(
        (building) => building.type === 'TOWN_HALL' && building.ownerTeamSide === team.side,
      );
      if (townHalls.length !== 1) {
        this.issue(
          issues,
          'INVALID_TOWN_HALL_COUNT',
          `${team.side} must have exactly one town hall`,
          'map.buildings',
        );
      } else {
        this.validateTownHallOwnership(townHalls[0]!, tilesByCoordinate, issues);
        const connectedKeys = findConnectedTerritory(connectivityTiles, townHalls[0]!, team.side);
        connectedKeysBySide.set(team.side, connectedKeys);
        if (!connectedKeys.has(hexKey(townHalls[0]!))) {
          this.issue(
            issues,
            'TOWN_HALL_TERRITORY_UNREACHABLE',
            `${team.side} town hall must be the source of reachable owned ground territory`,
            'map.buildings',
          );
        }
      }
    }

    const occupiedObjectCoordinates = new Set(occupiedBuildingCoordinates);
    const spawnSides = new Set(map.spawns.map((spawn) => spawn.teamSide));
    if (map.spawns.length !== 2 || spawnSides.size !== 2) {
      this.issue(
        issues,
        'INVALID_TEAM_SPAWNS',
        'Exactly one separate spawn is required for each team',
        'map.spawns',
      );
    }
    for (const [index, spawn] of map.spawns.entries()) {
      const path = `map.spawns.${index}`;
      this.validateObjectTile(spawn, tilesByCoordinate, issues, path);
      const spawnKey = this.coordinateKey(spawn);
      const tile = tilesByCoordinate.get(spawnKey);
      if (occupiedBuildingCoordinates.has(spawnKey)) {
        this.issue(issues, 'SPAWN_OBJECT_COLLISION', 'A team spawn cannot contain a building', path);
      }
      if (occupiedObjectCoordinates.has(spawnKey)) {
        this.issue(issues, 'DUPLICATE_TEAM_SPAWN', 'Teams must use different spawn hexes', path);
      }
      if (tile?.ownerTeamSide && tile.ownerTeamSide !== spawn.teamSide) {
        this.issue(
          issues,
          'ENEMY_TEAM_SPAWN',
          'A team spawn cannot be placed on another team\'s territory',
          path,
        );
      }
      occupiedObjectCoordinates.add(spawnKey);
    }

    for (const [index, tower] of map.towers.entries()) {
      this.validateObjectTile(tower, tilesByCoordinate, issues, `map.towers.${index}`);
      if (tower.status === 'CANCELLED') continue;
      const key = this.coordinateKey(tower);
      const tile = tilesByCoordinate.get(key);
      if (occupiedObjectCoordinates.has(key) || tile?.ownerTeamSide !== tower.teamSide) {
        this.issue(
          issues,
          'INVALID_TOWER_TILE',
        'A tower requires an owned tile without a building, team spawn, or another tower',
          `map.towers.${index}`,
        );
      }
      if (!connectedKeysBySide.get(tower.teamSide)?.has(hexKey(tower))) {
        this.issue(
          issues,
          'TOWER_NOT_CONNECTED',
          'A preconfigured tower must be connected to its team town hall through owned ground',
          `map.towers.${index}`,
        );
      }
      occupiedObjectCoordinates.add(key);

      for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
        const previousTower = map.towers[previousIndex]!;
        if (previousTower.status === 'CANCELLED') continue;
        const requiredDistance =
          (tower.protectionRadius ?? defaultTowerProtectionRadius) +
          (previousTower.protectionRadius ?? defaultTowerProtectionRadius) +
          1;
        if (this.hexDistance(tower, previousTower) < requiredDistance) {
          this.issue(
            issues,
            'TOWER_RADIUS_OVERLAP',
            'Tower protection areas may not overlap',
            `map.towers.${index}`,
          );
        }
      }
    }
  }

  private validateTownHallOwnership(
    townHall: CivilizationBuildingInputDto,
    tiles: Map<string, CivilizationMapInputDto['tiles'][number]>,
    issues: CivilizationConfigurationIssue[],
  ): void {
    const tile = tiles.get(this.coordinateKey(townHall));
    if (tile?.ownerTeamSide !== townHall.ownerTeamSide) {
      this.issue(
        issues,
        'TOWN_HALL_TILE_NOT_OWNED',
        'A town-hall tile must be owned by its team',
        'map.buildings',
      );
    }
  }

  private validateObjectTile(
    coordinate: Coordinate,
    tiles: Map<string, CivilizationMapInputDto['tiles'][number]>,
    issues: CivilizationConfigurationIssue[],
    path: string,
  ): void {
    const tile = tiles.get(this.coordinateKey(coordinate));
    if (!tile) {
      this.issue(issues, 'OBJECT_OUTSIDE_MAP', 'Map object must be on a playable tile', path);
    } else if (tile.terrainType === 'MOUNTAIN') {
      this.issue(issues, 'OBJECT_ON_MOUNTAIN', 'Mountain tiles cannot contain map objects', path);
    }
  }

  private coordinateKey(coordinate: Coordinate): string {
    return `${coordinate.q}:${coordinate.r}`;
  }

  private hexDistance(first: Coordinate, second: Coordinate): number {
    const dq = first.q - second.q;
    const dr = first.r - second.r;
    return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
  }

  private issue(
    issues: CivilizationConfigurationIssue[],
    code: string,
    message: string,
    path: string,
  ): void {
    issues.push({ code, message, path });
  }
}
