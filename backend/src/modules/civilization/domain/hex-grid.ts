export interface HexCoordinate {
  q: number;
  r: number;
}

export interface CivilizationConnectivityTile extends HexCoordinate {
  ownerTeamId: string | null;
  isPassable?: boolean;
}

export const AXIAL_HEX_DIRECTIONS: readonly HexCoordinate[] = Object.freeze([
  Object.freeze({ q: 1, r: 0 }),
  Object.freeze({ q: 1, r: -1 }),
  Object.freeze({ q: 0, r: -1 }),
  Object.freeze({ q: -1, r: 0 }),
  Object.freeze({ q: -1, r: 1 }),
  Object.freeze({ q: 0, r: 1 }),
]);

export function hexKey(coordinate: HexCoordinate): string {
  assertHexCoordinate(coordinate);
  return `${coordinate.q},${coordinate.r}`;
}

export function addHexCoordinates(left: HexCoordinate, right: HexCoordinate): HexCoordinate {
  assertHexCoordinate(left);
  assertHexCoordinate(right);
  return { q: left.q + right.q, r: left.r + right.r };
}

export function getHexNeighbors(coordinate: HexCoordinate): HexCoordinate[] {
  return AXIAL_HEX_DIRECTIONS.map((direction) => addHexCoordinates(coordinate, direction));
}

export function hexDistance(left: HexCoordinate, right: HexCoordinate): number {
  assertHexCoordinate(left);
  assertHexCoordinate(right);
  const deltaQ = left.q - right.q;
  const deltaR = left.r - right.r;
  const deltaS = -left.q - left.r - (-right.q - right.r);

  return (Math.abs(deltaQ) + Math.abs(deltaR) + Math.abs(deltaS)) / 2;
}

export function areHexesAdjacent(left: HexCoordinate, right: HexCoordinate): boolean {
  return hexDistance(left, right) === 1;
}

export function findConnectedHexKeys(
  start: HexCoordinate,
  traversableCoordinates: Iterable<HexCoordinate>,
): Set<string> {
  const coordinateByKey = new Map<string, HexCoordinate>();
  for (const coordinate of traversableCoordinates) {
    coordinateByKey.set(hexKey(coordinate), coordinate);
  }

  const startKey = hexKey(start);
  if (!coordinateByKey.has(startKey)) {
    return new Set<string>();
  }

  const visited = new Set<string>([startKey]);
  const queue: HexCoordinate[] = [start];
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const coordinate = queue[queueIndex];
    queueIndex += 1;
    if (coordinate === undefined) {
      continue;
    }

    for (const neighbor of getHexNeighbors(coordinate)) {
      const neighborKey = hexKey(neighbor);
      const traversableNeighbor = coordinateByKey.get(neighborKey);
      if (traversableNeighbor === undefined || visited.has(neighborKey)) {
        continue;
      }

      visited.add(neighborKey);
      queue.push(traversableNeighbor);
    }
  }

  return visited;
}

export function findConnectedTerritory(
  tiles: readonly CivilizationConnectivityTile[],
  townHallCoordinate: HexCoordinate,
  teamId: string,
): Set<string> {
  if (teamId.length === 0) {
    throw new RangeError('teamId cannot be empty');
  }

  return findConnectedHexKeys(
    townHallCoordinate,
    tiles.filter((tile) => tile.ownerTeamId === teamId && tile.isPassable !== false),
  );
}

function assertHexCoordinate(coordinate: HexCoordinate): void {
  if (!Number.isInteger(coordinate.q) || !Number.isInteger(coordinate.r)) {
    throw new RangeError('Axial hex coordinates must be integers');
  }
}
