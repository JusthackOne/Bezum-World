import { z } from "zod";
import { addDays, addHours, isAfter, parseISO } from "date-fns";

import {
  CIVILIZATION_ATTRIBUTE_KEYS,
  type CivilizationAdminGameInput,
  type CivilizationAdminMapInput,
  type CivilizationSettings,
  type CivilizationValidationIssue,
  type HexCoordinate,
} from "@/entities/civilization";
import { coordinateKey, createHexagonalMap, hexDistance } from "@/features/civilization/model";
import { toLocalDateTimeInput } from "@/shared/lib/date-time";

const canonicalDecimalPattern = /^(?:0|[1-9]\d{0,17})(?:\.\d{0,11}[1-9])?$/;
const HALF_UNITS_PER_POINT = 2;

export function civilizationHalfUnitsToPoints(halfUnits: number): number {
  return halfUnits / HALF_UNITS_PER_POINT;
}

export function civilizationPointsToHalfUnits(points: number): number {
  return points * HALF_UNITS_PER_POINT;
}

const attributeAmountsSchema = z.object({
  strength: z.string().regex(canonicalDecimalPattern, "Enter a canonical non-negative amount"),
  charisma: z.string().regex(canonicalDecimalPattern, "Enter a canonical non-negative amount"),
  endurance: z.string().regex(canonicalDecimalPattern, "Enter a canonical non-negative amount"),
  intelligence: z.string().regex(canonicalDecimalPattern, "Enter a canonical non-negative amount"),
});

const coordinateSchema = z.object({ q: z.number().int(), r: z.number().int() });
const nonNegativeDecimal = z
  .string()
  .regex(canonicalDecimalPattern, "Enter a canonical non-negative amount");

export const civilizationGameFormSchema = z
  .object({
    name: z.string().trim().min(3, "Name must contain at least 3 characters").max(120),
    startAt: z.string().min(1, "Start date is required"),
    endAt: z.string().min(1, "End date is required"),
    teams: z.tuple([
      z.object({
        id: z.string().optional(),
        side: z.literal("TEAM_A"),
        name: z.string().trim().min(2, "Team name is required").max(60),
        color: z.string().regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex color"),
        visualKey: z.string().trim().min(1),
        playerIds: z.array(z.string()),
      }),
      z.object({
        id: z.string().optional(),
        side: z.literal("TEAM_B"),
        name: z.string().trim().min(2, "Team name is required").max(60),
        color: z.string().regex(/^#[0-9a-f]{6}$/i, "Use a six-digit hex color"),
        visualKey: z.string().trim().min(1),
        playerIds: z.array(z.string()),
      }),
    ]),
    map: z.object({
      tiles: z.array(
        coordinateSchema.extend({
          terrainType: z.enum(["GROUND", "MOUNTAIN"]),
          ownerTeamSide: z.enum(["TEAM_A", "TEAM_B"]).nullable(),
        }),
      ),
      spawns: z
        .array(coordinateSchema.extend({ teamSide: z.enum(["TEAM_A", "TEAM_B"]) }))
        .length(2),
      buildings: z.array(
        coordinateSchema.extend({
          type: z.enum(["TOWN_HALL", "GOLD_BUILDING", "ATTRIBUTE_BUILDING"]),
          ownerTeamSide: z.enum(["TEAM_A", "TEAM_B"]).nullable(),
          attributeKey: z.enum(CIVILIZATION_ATTRIBUTE_KEYS).nullable(),
          incomePerHour: nonNegativeDecimal,
          captureRequiredUnits: z.number().int().positive(),
        }),
      ),
      towers: z.array(
        coordinateSchema.extend({
          teamSide: z.enum(["TEAM_A", "TEAM_B"]),
          status: z.enum(["UNDER_CONSTRUCTION", "ACTIVE", "DESTROYED"]),
          protectionRadius: z.number().int().nonnegative().optional(),
          destructionRequiredActions: z.number().int().positive().optional(),
        }),
      ),
    }),
    settings: z.object({
      actionPoints: z.object({
        maximumUnits: z.number().int().positive(),
        initialUnits: z.number().int().nonnegative(),
        regenerationUnits: z.number().int().positive(),
        regenerationIntervalMinutes: z.number().int().positive(),
      }),
      costs: z.object({
        ownedMoveUnits: z.number().int().nonnegative(),
        otherMoveUnits: z.number().int().nonnegative(),
        attackPlayerUnits: z.number().int().nonnegative(),
        buildingCaptureUnits: z.number().int().nonnegative(),
        towerBuildUnits: z.number().int().nonnegative(),
        towerAttackUnits: z.number().int().nonnegative(),
        townHallCaptureUnits: z.number().int().nonnegative(),
        townHallDefenseUnits: z.number().int().nonnegative(),
        towerRepairUnits: z.number().int().nonnegative(),
      }),
      territoryGoldPerHour: nonNegativeDecimal,
      goldBuildingIncomePerHour: nonNegativeDecimal,
      attributeBuildingIncomePerHour: attributeAmountsSchema,
      buildingCapture: z.object({
        requiredUnits: z.number().int().positive(),
        contributionUnits: z.number().int().positive(),
      }),
      combat: z.object({
        attackerWinPercent: z.number().min(0).max(100),
        defenderWinPercent: z.number().min(0).max(100),
      }),
      tower: z.object({
        buildGoldCost: nonNegativeDecimal,
        constructionMinutes: z.number().int().nonnegative(),
        repairMinutes: z.number().int().nonnegative(),
        protectionRadius: z.number().int().nonnegative(),
        repairGoldCost: nonNegativeDecimal,
        destructionRequiredActions: z.number().int().positive(),
      }),
      catapult: z.object({
        enabled: z.boolean(),
        goldPrice: nonNegativeDecimal,
        actionPointUnits: z.number().int().nonnegative(),
        damage: z.number().int().positive(),
      }),
      repairKit: z.object({
        enabled: z.boolean(),
        goldPrice: nonNegativeDecimal,
        repairActions: z.number().int().positive(),
      }),
      townHall: z.object({
        captureRequiredUnits: z.number().int().positive(),
        contributionUnits: z.number().int().positive(),
        defenseReductionUnits: z.number().int().positive(),
        defenseGoldCost: nonNegativeDecimal,
      }),
      scoreWeights: z.object({
        gold: nonNegativeDecimal,
        strength: nonNegativeDecimal,
        charisma: nonNegativeDecimal,
        endurance: nonNegativeDecimal,
        intelligence: nonNegativeDecimal,
      }),
      winnerBonus: nonNegativeDecimal,
    }),
  })
  .superRefine((value, context) => {
    if (!isAfter(parseISO(value.endAt), parseISO(value.startAt))) {
      context.addIssue({
        code: "custom",
        path: ["endAt"],
        message: "End date must be after start date",
      });
    }
    if (
      value.settings.combat.attackerWinPercent + value.settings.combat.defenderWinPercent !==
      100
    ) {
      context.addIssue({
        code: "custom",
        path: ["settings", "combat", "defenderWinPercent"],
        message: "Attacker and defender probabilities must total 100%",
      });
    }
    if (value.settings.actionPoints.initialUnits > value.settings.actionPoints.maximumUnits) {
      context.addIssue({
        code: "custom",
        path: ["settings", "actionPoints", "initialUnits"],
        message: "Initial action points cannot exceed the maximum",
      });
    }
    if (
      value.settings.buildingCapture.contributionUnits >
      value.settings.buildingCapture.requiredUnits
    ) {
      context.addIssue({
        code: "custom",
        path: ["settings", "buildingCapture", "contributionUnits"],
        message: "Building contribution cannot exceed the required progress",
      });
    }
    if (value.settings.townHall.contributionUnits > value.settings.townHall.captureRequiredUnits) {
      context.addIssue({
        code: "custom",
        path: ["settings", "townHall", "contributionUnits"],
        message: "Town-hall contribution cannot exceed the required progress",
      });
    }
    if (
      value.settings.townHall.defenseReductionUnits > value.settings.townHall.captureRequiredUnits
    ) {
      context.addIssue({
        code: "custom",
        path: ["settings", "townHall", "defenseReductionUnits"],
        message: "Town-hall defense reduction cannot exceed the required progress",
      });
    }
    const allPlayers = value.teams.flatMap((team) => team.playerIds);
    if (new Set(allPlayers).size !== allPlayers.length) {
      context.addIssue({
        code: "custom",
        path: ["teams"],
        message: "A player can belong to only one team",
      });
    }
  });

export const DEFAULT_CIVILIZATION_SETTINGS: CivilizationSettings = {
  actionPoints: {
    maximumUnits: 16,
    initialUnits: 16,
    regenerationUnits: 2,
    regenerationIntervalMinutes: 180,
  },
  costs: {
    ownedMoveUnits: 1,
    otherMoveUnits: 2,
    attackPlayerUnits: 4,
    buildingCaptureUnits: 2,
    towerBuildUnits: 2,
    towerAttackUnits: 6,
    townHallCaptureUnits: 2,
    townHallDefenseUnits: 2,
    towerRepairUnits: 2,
  },
  territoryGoldPerHour: "5",
  goldBuildingIncomePerHour: "25",
  attributeBuildingIncomePerHour: {
    strength: "1",
    charisma: "1",
    endurance: "1",
    intelligence: "1",
  },
  buildingCapture: { requiredUnits: 6, contributionUnits: 2 },
  combat: { attackerWinPercent: 30, defenderWinPercent: 70 },
  tower: {
    buildGoldCost: "200",
    constructionMinutes: 180,
    repairMinutes: 0,
    protectionRadius: 1,
    repairGoldCost: "75",
    destructionRequiredActions: 3,
  },
  catapult: {
    enabled: true,
    goldPrice: "150",
    actionPointUnits: 4,
    damage: 2,
  },
  repairKit: {
    enabled: true,
    goldPrice: "75",
    repairActions: 1,
  },
  townHall: {
    captureRequiredUnits: 16,
    contributionUnits: 2,
    defenseReductionUnits: 1,
    defenseGoldCost: "50",
  },
  scoreWeights: {
    gold: "1",
    strength: "25",
    charisma: "25",
    endurance: "25",
    intelligence: "25",
  },
  winnerBonus: "0",
};

export function createDefaultCivilizationMap(): CivilizationAdminMapInput {
  const tiles = createHexagonalMap(3).map((coordinate) => ({
    ...coordinate,
    terrainType: "GROUND" as const,
    ownerTeamSide:
      coordinate.q < 0 ? ("TEAM_A" as const) : coordinate.q > 0 ? ("TEAM_B" as const) : null,
  }));
  return {
    tiles,
    spawns: [
      { q: -2, r: 0, teamSide: "TEAM_A" },
      { q: 2, r: 0, teamSide: "TEAM_B" },
    ],
    buildings: [
      {
        q: -3,
        r: 0,
        type: "TOWN_HALL",
        ownerTeamSide: "TEAM_A",
        attributeKey: null,
        incomePerHour: "0",
        captureRequiredUnits: 16,
      },
      {
        q: 3,
        r: 0,
        type: "TOWN_HALL",
        ownerTeamSide: "TEAM_B",
        attributeKey: null,
        incomePerHour: "0",
        captureRequiredUnits: 16,
      },
    ],
    towers: [],
  };
}

export function createDefaultCivilizationGameInput(): CivilizationAdminGameInput {
  const startAt = addHours(new Date(), 24);
  const endAt = addDays(startAt, 7);
  return {
    name: "Civilization season",
    startAt: toLocalDateTimeInput(startAt.toISOString()),
    endAt: toLocalDateTimeInput(endAt.toISOString()),
    teams: [
      {
        side: "TEAM_A",
        name: "Azure Covenant",
        color: "#4f7cff",
        visualKey: "azure-covenant",
        playerIds: [],
      },
      {
        side: "TEAM_B",
        name: "Crimson Dominion",
        color: "#ef476f",
        visualKey: "crimson-dominion",
        playerIds: [],
      },
    ],
    map: createDefaultCivilizationMap(),
    settings: structuredClone(DEFAULT_CIVILIZATION_SETTINGS),
  };
}

function issue(
  code: string,
  message: string,
  coordinate: HexCoordinate | null = null,
): CivilizationValidationIssue {
  return { code, message, path: "map", coordinate, severity: "ERROR" };
}

export function validateCivilizationMap(
  map: CivilizationAdminMapInput,
  teams: CivilizationAdminGameInput["teams"],
  defaultTowerProtectionRadius = DEFAULT_CIVILIZATION_SETTINGS.tower.protectionRadius,
): CivilizationValidationIssue[] {
  const issues: CivilizationValidationIssue[] = [];
  const tiles = new Map(map.tiles.map((tile) => [coordinateKey(tile), tile]));
  const validGround = (coordinate: HexCoordinate): boolean => {
    const tile = tiles.get(coordinateKey(coordinate));
    return Boolean(tile && tile.terrainType === "GROUND");
  };

  if (map.tiles.length === 0) {
    issues.push(issue("MAP_EMPTY", "Add at least one playable hex."));
  }

  const seenTileCoordinates = new Set<string>();
  map.tiles.forEach((tile) => {
    const key = coordinateKey(tile);
    if (seenTileCoordinates.has(key)) {
      issues.push(issue("DUPLICATE_TILE", "Playable hex coordinates must be unique.", tile));
    }
    seenTileCoordinates.add(key);
    if (hexDistance({ q: 0, r: 0 }, tile) > 25) {
      issues.push(issue("COORDINATE_OUT_OF_RANGE", "Hexes must be within map radius 25.", tile));
    }
    if (tile.terrainType === "MOUNTAIN" && tile.ownerTeamSide) {
      issues.push(issue("MOUNTAIN_HAS_OWNER", "A mountain cannot have an owner.", tile));
    }
  });

  const assignedUserIds = new Set<string>();
  teams.forEach((team) => {
    team.playerIds.forEach((userId) => {
      if (assignedUserIds.has(userId)) {
        issues.push(issue("PLAYER_ASSIGNED_TWICE", `Player ${userId} belongs to both teams.`));
      }
      assignedUserIds.add(userId);
    });
  });

  (["TEAM_A", "TEAM_B"] as const).forEach((side) => {
    const halls = map.buildings.filter(
      (building) => building.type === "TOWN_HALL" && building.ownerTeamSide === side,
    );
    if (halls.length !== 1) {
      issues.push(issue("TOWN_HALL_COUNT", `${side} must have exactly one town hall.`));
    }
  });
  if (map.buildings.filter((building) => building.type === "TOWN_HALL").length !== 2) {
    issues.push(issue("TOWN_HALL_COUNT", "The map must contain exactly two town halls."));
  }

  map.buildings.forEach((building) => {
    if (!validGround(building)) {
      issues.push(
        issue("INVALID_BUILDING_TILE", "A building must be on playable ground.", building),
      );
    }
    if (building.type === "ATTRIBUTE_BUILDING" && !building.attributeKey) {
      issues.push(issue("ATTRIBUTE_REQUIRED", "Select an attribute for this building.", building));
    }
    if (building.type !== "ATTRIBUTE_BUILDING" && building.attributeKey) {
      issues.push(
        issue(
          "ATTRIBUTE_NOT_ALLOWED",
          "Only attribute buildings may select an attribute.",
          building,
        ),
      );
    }
    if (!canonicalDecimalPattern.test(building.incomePerHour)) {
      issues.push(
        issue(
          "INVALID_BUILDING_INCOME",
          "Building income must be a canonical non-negative decimal.",
          building,
        ),
      );
    }
    if (!Number.isInteger(building.captureRequiredUnits) || building.captureRequiredUnits <= 0) {
      issues.push(
        issue(
          "INVALID_CAPTURE_REQUIREMENT",
          "Building capture units must be a positive integer.",
          building,
        ),
      );
    }
    const buildingTile = tiles.get(coordinateKey(building));
    if (building.ownerTeamSide && buildingTile?.ownerTeamSide !== building.ownerTeamSide) {
      issues.push(
        issue(
          "BUILDING_OWNER_MISMATCH",
          "An owned building and its hex must have the same owner.",
          building,
        ),
      );
    }
  });
  const spawnSides = new Set(map.spawns.map((spawn) => spawn.teamSide));
  if (map.spawns.length !== 2 || spawnSides.size !== 2) {
    issues.push(issue("INVALID_TEAM_SPAWNS", "Configure one separate spawn for each team."));
  }
  map.spawns.forEach((spawn) => {
    if (!validGround(spawn)) {
      issues.push(
        issue("INVALID_SPAWN_TILE", `${spawn.teamSide} spawn must be on playable ground.`, spawn),
      );
    }
    const tile = tiles.get(coordinateKey(spawn));
    if (tile?.ownerTeamSide && tile.ownerTeamSide !== spawn.teamSide) {
      issues.push(issue("ENEMY_TEAM_SPAWN", "A spawn cannot be on enemy territory.", spawn));
    }
  });
  map.towers.forEach((tower, index) => {
    if (!validGround(tower)) {
      issues.push(issue("INVALID_TOWER_TILE", "A tower must be on playable ground.", tower));
    }
    if (tiles.get(coordinateKey(tower))?.ownerTeamSide !== tower.teamSide) {
      issues.push(issue("TOWER_OWNER_MISMATCH", "A tower must be on an owned team hex.", tower));
    }
    const radius = tower.protectionRadius ?? defaultTowerProtectionRadius;
    if (!Number.isInteger(radius) || radius < 0) {
      issues.push(
        issue(
          "INVALID_TOWER_RADIUS",
          "Tower protection radius must be a non-negative integer.",
          tower,
        ),
      );
      return;
    }
    for (let previousIndex = 0; previousIndex < index; previousIndex += 1) {
      const previousTower = map.towers[previousIndex]!;
      const previousRadius = previousTower.protectionRadius ?? defaultTowerProtectionRadius;
      if (hexDistance(tower, previousTower) < radius + previousRadius + 1) {
        issues.push(
          issue("TOWER_RADIUS_OVERLAP", "Tower protection areas may not overlap.", tower),
        );
      }
    }
  });

  const objectCoordinates = new Map<string, number>();
  [...map.buildings, ...map.spawns, ...map.towers].forEach((object) => {
    const key = coordinateKey(object);
    objectCoordinates.set(key, (objectCoordinates.get(key) ?? 0) + 1);
  });
  objectCoordinates.forEach((count, key) => {
    if (count > 1) {
      const [q, r] = key.split(":").map(Number);
      issues.push(issue("OBJECT_COLLISION", "Map objects cannot share a hex.", { q: q!, r: r! }));
    }
  });

  return issues;
}
