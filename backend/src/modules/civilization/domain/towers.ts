import { hexDistance, type HexCoordinate } from './hex-grid';

export interface TowerProtectionArea {
  center: HexCoordinate;
  radius: number;
}

export interface TowerOverlapConflict {
  index: number;
  area: TowerProtectionArea;
}

export function minimumNonOverlappingTowerDistance(
  firstRadius: number,
  secondRadius: number,
): number {
  assertRadius(firstRadius);
  assertRadius(secondRadius);
  return firstRadius + secondRadius + 1;
}

export function towerProtectionAreasOverlap(
  first: TowerProtectionArea,
  second: TowerProtectionArea,
): boolean {
  assertRadius(first.radius);
  assertRadius(second.radius);
  return hexDistance(first.center, second.center) <= first.radius + second.radius;
}

export function isOnTowerAttackBoundary(
  player: HexCoordinate,
  tower: TowerProtectionArea,
): boolean {
  assertRadius(tower.radius);
  return hexDistance(player, tower.center) === tower.radius + 1;
}

export function findTowerOverlap(
  candidate: TowerProtectionArea,
  existingAreas: readonly TowerProtectionArea[],
): TowerOverlapConflict | null {
  for (const [index, area] of existingAreas.entries()) {
    if (towerProtectionAreasOverlap(candidate, area)) {
      return { index, area };
    }
  }

  return null;
}

function assertRadius(radius: number): void {
  if (!Number.isInteger(radius) || radius < 0) {
    throw new RangeError('Tower protection radius must be a non-negative integer');
  }
}
