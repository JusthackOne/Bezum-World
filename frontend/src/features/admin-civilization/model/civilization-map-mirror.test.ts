import { describe, expect, test } from "bun:test";

import { type CivilizationAdminMapInput } from "@/entities/civilization";

import { mirrorCivilizationMap } from "./civilization-map-mirror";

const groundTile = (q: number, r: number, ownerTeamSide: "TEAM_A" | "TEAM_B" | null) => ({
  q,
  r,
  terrainType: "GROUND" as const,
  ownerTeamSide,
});

describe("mirrorCivilizationMap", () => {
  test("replaces the right side with mirrored cells and objects from the left side", () => {
    const map: CivilizationAdminMapInput = {
      tiles: [
        groundTile(-1, 0, "TEAM_A"),
        groundTile(1, -1, "TEAM_A"),
        groundTile(-2, 0, "TEAM_A"),
        groundTile(-3, 0, "TEAM_A"),
        groundTile(-4, 0, "TEAM_A"),
        groundTile(8, 0, "TEAM_B"),
      ],
      buildings: [
        {
          id: "existing-building-id",
          q: -1,
          r: 0,
          type: "TOWN_HALL",
          ownerTeamSide: "TEAM_A",
          attributeKey: null,
          incomePerHour: "0",
          captureRequiredUnits: 16,
        },
        {
          q: -4,
          r: 0,
          type: "GOLD_BUILDING",
          ownerTeamSide: "TEAM_A",
          attributeKey: null,
          incomePerHour: "10",
          captureRequiredUnits: 6,
        },
        {
          q: 8,
          r: 0,
          type: "GOLD_BUILDING",
          ownerTeamSide: "TEAM_B",
          attributeKey: null,
          incomePerHour: "99",
          captureRequiredUnits: 6,
        },
      ],
      spawns: [{ q: -2, r: 0, teamSide: "TEAM_A" }],
      towers: [
        {
          q: -3,
          r: 0,
          teamSide: "TEAM_A",
          status: "ACTIVE",
          protectionRadius: 2,
          destructionRequiredActions: 4,
        },
      ],
    };

    const mirrored = mirrorCivilizationMap(map);

    expect(mirrored.tiles.find((tile) => tile.q === 1 && tile.r === -1)?.ownerTeamSide).toBe(
      "TEAM_B",
    );
    expect(mirrored.tiles.find((tile) => tile.q === 4 && tile.r === -4)?.ownerTeamSide).toBe(
      "TEAM_B",
    );
    expect(mirrored.buildings).toContainEqual({
      q: 1,
      r: -1,
      type: "TOWN_HALL",
      ownerTeamSide: "TEAM_B",
      attributeKey: null,
      incomePerHour: "0",
      captureRequiredUnits: 16,
    });
    expect(mirrored.buildings).toContainEqual({
      q: 4,
      r: -4,
      type: "GOLD_BUILDING",
      ownerTeamSide: "TEAM_B",
      attributeKey: null,
      incomePerHour: "10",
      captureRequiredUnits: 6,
    });
    expect(mirrored.spawns).toContainEqual({ q: 2, r: -2, teamSide: "TEAM_B" });
    expect(mirrored.towers).toContainEqual({
      q: 3,
      r: -3,
      teamSide: "TEAM_B",
      status: "ACTIVE",
      protectionRadius: 2,
      destructionRequiredActions: 4,
    });
    expect(mirrored.tiles.some((tile) => tile.q === 8 && tile.r === 0)).toBe(false);
    expect(mirrored.buildings.some((building) => building.q === 8 && building.r === 0)).toBe(
      false,
    );
  });

  test("keeps the center unchanged and does not duplicate objects when run repeatedly", () => {
    const map: CivilizationAdminMapInput = {
      tiles: [groundTile(-1, 0, null), groundTile(0, 0, null)],
      buildings: [
        {
          q: -1,
          r: 0,
          type: "GOLD_BUILDING",
          ownerTeamSide: null,
          attributeKey: null,
          incomePerHour: "10",
          captureRequiredUnits: 6,
        },
      ],
      spawns: [],
      towers: [],
    };

    const mirroredTwice = mirrorCivilizationMap(mirrorCivilizationMap(map));

    expect(mirroredTwice.tiles).toHaveLength(3);
    expect(mirroredTwice.buildings).toHaveLength(2);
  });
});
