import {
  type CivilizationAdminMapInput,
  type CivilizationTeamSide,
  type HexCoordinate,
} from "@/entities/civilization";

function mirrorCoordinate({ q, r }: HexCoordinate): HexCoordinate {
  return { q: -q, r: q + r };
}

function oppositeTeamSide(side: CivilizationTeamSide): CivilizationTeamSide {
  return side === "TEAM_A" ? "TEAM_B" : "TEAM_A";
}

export function mirrorCivilizationMap(
  current: CivilizationAdminMapInput,
): CivilizationAdminMapInput {
  const leftTiles = current.tiles.filter((tile) => tile.q < 0);
  const centerTiles = current.tiles.filter((tile) => tile.q === 0);
  const leftBuildings = current.buildings.filter((building) => building.q < 0);
  const centerBuildings = current.buildings.filter((building) => building.q === 0);
  const leftSpawns = current.spawns.filter((spawn) => spawn.q < 0);
  const centerSpawns = current.spawns.filter((spawn) => spawn.q === 0);
  const leftTowers = current.towers.filter((tower) => tower.q < 0);
  const centerTowers = current.towers.filter((tower) => tower.q === 0);

  return {
    tiles: [
      ...structuredClone(leftTiles),
      ...structuredClone(centerTiles),
      ...leftTiles.map((tile) => ({
        ...tile,
        ...mirrorCoordinate(tile),
        ownerTeamSide: tile.ownerTeamSide ? oppositeTeamSide(tile.ownerTeamSide) : null,
      })),
    ],
    buildings: [
      ...structuredClone(leftBuildings),
      ...structuredClone(centerBuildings),
      ...leftBuildings.map((building) => ({
        ...mirrorCoordinate(building),
        type: building.type,
        ownerTeamSide: building.ownerTeamSide
          ? oppositeTeamSide(building.ownerTeamSide)
          : null,
        attributeKey: building.attributeKey,
        incomePerHour: building.incomePerHour,
        captureRequiredUnits: building.captureRequiredUnits,
      })),
    ],
    spawns: [
      ...structuredClone(leftSpawns),
      ...structuredClone(centerSpawns),
      ...leftSpawns.map((spawn) => ({
        ...mirrorCoordinate(spawn),
        teamSide: oppositeTeamSide(spawn.teamSide),
      })),
    ],
    towers: [
      ...structuredClone(leftTowers),
      ...structuredClone(centerTowers),
      ...leftTowers.map((tower) => ({
        ...tower,
        ...mirrorCoordinate(tower),
        teamSide: oppositeTeamSide(tower.teamSide),
      })),
    ],
  };
}
