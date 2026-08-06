import { describe, expect, it } from "bun:test";

import {
  civilizationHalfUnitsToPoints,
  civilizationPointsToHalfUnits,
} from "./civilization-form";

describe("Civilization administration point conversion", () => {
  it.each([
    { halfUnits: 16, points: 8 },
    { halfUnits: 2, points: 1 },
    { halfUnits: 1, points: 0.5 },
  ])("converts $halfUnits half-units to $points player points and back", ({ halfUnits, points }) => {
    expect(civilizationHalfUnitsToPoints(halfUnits)).toBe(points);
    expect(civilizationPointsToHalfUnits(points)).toBe(halfUnits);
  });
});
