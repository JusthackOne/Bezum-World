import { describe, expect, test } from 'bun:test';

import { hexDistance } from './hex-grid';
import { towerProtectionAreasOverlap } from './towers';

describe('Catapult tower-boundary geometry', () => {
  test('accepts only coordinates exactly on the configured boundary', () => {
    const tower = { q: 0, r: 0 };

    expect(hexDistance({ q: 2, r: -1 }, tower)).toBe(2);
    expect(hexDistance({ q: 1, r: 0 }, tower)).toBe(1);
    expect(hexDistance({ q: 3, r: -1 }, tower)).toBe(3);
  });

  test('keeps relocated tower protection areas separated', () => {
    expect(
      towerProtectionAreasOverlap({ center: { q: 0, r: 0 }, radius: 1 }, {
        center: { q: 3, r: 0 },
        radius: 1,
      }),
    ).toBe(false);
    expect(
      towerProtectionAreasOverlap({ center: { q: 0, r: 0 }, radius: 1 }, {
        center: { q: 2, r: 0 },
        radius: 1,
      }),
    ).toBe(true);
  });
});
