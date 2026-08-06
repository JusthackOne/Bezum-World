import { describe, expect, test } from 'bun:test';

import { isOnTowerAttackBoundary, towerProtectionAreasOverlap } from './towers';

describe('Catapult tower-boundary geometry', () => {
  test('accepts only the first coordinate outside the protected area', () => {
    const tower = { q: 0, r: 0 };

    expect(isOnTowerAttackBoundary({ q: 2, r: -1 }, { center: tower, radius: 1 })).toBe(true);
    expect(isOnTowerAttackBoundary({ q: 1, r: 0 }, { center: tower, radius: 1 })).toBe(false);
    expect(isOnTowerAttackBoundary({ q: 3, r: -1 }, { center: tower, radius: 1 })).toBe(false);
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
