import { defineHex, Grid, Orientation, type Hex } from "honeycomb-grid";

import type { HexCoordinate } from "@/entities/civilization";

export const CIVILIZATION_HEX_RADIUS = 48;
export const CIVILIZATION_HEX_PADDING = 72;

const CivilizationHex = defineHex({
  dimensions: CIVILIZATION_HEX_RADIUS,
  orientation: Orientation.POINTY,
});

export interface CivilizationHexLayoutItem {
  coordinate: HexCoordinate;
  center: { x: number; y: number };
  corners: Array<{ x: number; y: number }>;
}

export interface CivilizationHexLayout {
  items: Map<string, CivilizationHexLayoutItem>;
  width: number;
  height: number;
}

export function coordinateKey(coordinate: HexCoordinate): string {
  return `${coordinate.q}:${coordinate.r}`;
}

export function hexDistance(from: HexCoordinate, to: HexCoordinate): number {
  const fromS = -from.q - from.r;
  const toS = -to.q - to.r;
  return Math.max(Math.abs(from.q - to.q), Math.abs(from.r - to.r), Math.abs(fromS - toS));
}

export function createHexLayout(coordinates: HexCoordinate[]): CivilizationHexLayout {
  if (coordinates.length === 0) {
    return { items: new Map(), width: 320, height: 240 };
  }

  const grid = new Grid(CivilizationHex, coordinates);
  const hexes = grid.toArray();
  const allCorners = hexes.flatMap((hex) => hex.corners);
  const minX = Math.min(...allCorners.map((corner) => corner.x));
  const maxX = Math.max(...allCorners.map((corner) => corner.x));
  const minY = Math.min(...allCorners.map((corner) => corner.y));
  const maxY = Math.max(...allCorners.map((corner) => corner.y));
  const offsetX = CIVILIZATION_HEX_PADDING - minX;
  const offsetY = CIVILIZATION_HEX_PADDING - minY;

  const items = new Map<string, CivilizationHexLayoutItem>();

  hexes.forEach((hex: Hex) => {
    const coordinate = { q: hex.q, r: hex.r };
    items.set(coordinateKey(coordinate), {
      coordinate,
      center: { x: hex.x + offsetX, y: hex.y + offsetY },
      corners: hex.corners.map((corner) => ({
        x: corner.x + offsetX,
        y: corner.y + offsetY,
      })),
    });
  });

  return {
    items,
    width: maxX - minX + CIVILIZATION_HEX_PADDING * 2,
    height: maxY - minY + CIVILIZATION_HEX_PADDING * 2,
  };
}

export function createHexagonalMap(radius: number): HexCoordinate[] {
  const coordinates: HexCoordinate[] = [];

  for (let q = -radius; q <= radius; q += 1) {
    const minimumR = Math.max(-radius, -q - radius);
    const maximumR = Math.min(radius, -q + radius);

    for (let r = minimumR; r <= maximumR; r += 1) {
      coordinates.push({ q, r });
    }
  }

  return coordinates;
}
