export const HALF_UNITS_PER_POINT = 2;

export function pointsToHalfUnits(points: number): number {
  if (!Number.isFinite(points) || points < 0 || !Number.isInteger(points * 2)) {
    throw new RangeError('Points must be a non-negative multiple of 0.5');
  }

  return points * HALF_UNITS_PER_POINT;
}

export function halfUnitsToPoints(units: number): number {
  if (!Number.isInteger(units) || units < 0) {
    throw new RangeError('Half-point units must be a non-negative integer');
  }

  return units / HALF_UNITS_PER_POINT;
}
