import { describe, expect, test } from 'bun:test';

import {
  CIVILIZATION_ATTRIBUTE_KEYS,
  areHexesAdjacent,
  calculateTeamScore,
  civilizationSettingsSchema,
  defaultCivilizationSettings,
  findConnectedTerritory,
  halfUnitsToPoints,
  hexDistance,
  parseDecimal,
  pointsToHalfUnits,
  settleActionPoints,
  settleDecimalResource,
  splitIntegerReward,
  towerProtectionAreasOverlap,
  type CivilizationSettings,
} from '../src/modules/civilization/domain';

describe('Civilization settings', () => {
  test('uses only the four canonical account attributes', () => {
    expect(CIVILIZATION_ATTRIBUTE_KEYS).toEqual([
      'strength',
      'charisma',
      'endurance',
      'intelligence',
    ]);
    expect(civilizationSettingsSchema.parse(defaultCivilizationSettings)).toEqual(
      defaultCivilizationSettings,
    );
  });

  test('rejects a separate agility setting and invalid combat totals', () => {
    const withAgility = structuredClone(defaultCivilizationSettings) as Record<string, unknown>;
    const income = withAgility.attributeBuildingIncomePerHour as Record<string, string>;
    income.agility = '1';
    expect(civilizationSettingsSchema.safeParse(withAgility).success).toBe(false);

    const invalidCombat: CivilizationSettings = structuredClone(defaultCivilizationSettings);
    invalidCombat.combat.attackerWinPercent = 40;
    expect(civilizationSettingsSchema.safeParse(invalidCombat).success).toBe(false);
  });

  test('stores every half-point default as integer units', () => {
    expect(defaultCivilizationSettings.costs.ownedMoveUnits).toBe(1);
    expect(halfUnitsToPoints(defaultCivilizationSettings.costs.ownedMoveUnits)).toBe(0.5);
    expect(pointsToHalfUnits(3)).toBe(6);
    expect(() => pointsToHalfUnits(0.25)).toThrow();
  });

  test('allows administrators to configure zero-cost actions', () => {
    const settings: CivilizationSettings = structuredClone(defaultCivilizationSettings);
    settings.costs.towerAttackUnits = 0;
    settings.tower.constructionMinutes = 0;

    expect(civilizationSettingsSchema.safeParse(settings).success).toBe(true);
  });
});

describe('action-point settlement', () => {
  const lastUpdate = new Date('2026-07-31T00:00:00.000Z');

  test('regenerates lazily while preserving an incomplete interval', () => {
    const result = settleActionPoints({
      currentUnits: 4,
      maximumUnits: 16,
      regenerationUnits: 2,
      regenerationIntervalMinutes: 180,
      lastActionPointUpdateAt: lastUpdate,
      now: new Date('2026-07-31T07:00:00.000Z'),
    });

    expect(result.actionPointUnits).toBe(8);
    expect(result.regeneratedUnits).toBe(4);
    expect(result.lastActionPointUpdateAt.toISOString()).toBe('2026-07-31T06:00:00.000Z');
    expect(result.nextRegenerationAt?.toISOString()).toBe('2026-07-31T09:00:00.000Z');
  });

  test('caps AP and discards banked regeneration once full', () => {
    const now = new Date('2026-08-02T00:00:00.000Z');
    const result = settleActionPoints({
      currentUnits: 15,
      maximumUnits: 16,
      regenerationUnits: 2,
      regenerationIntervalMinutes: 180,
      lastActionPointUpdateAt: lastUpdate,
      now,
    });

    expect(result.actionPointUnits).toBe(16);
    expect(result.regeneratedUnits).toBe(1);
    expect(result.lastActionPointUpdateAt).toEqual(now);
    expect(result.nextRegenerationAt).toBeNull();
  });
});

describe('axial hex math and connectivity', () => {
  test('uses real axial distance and direct adjacency', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 2, r: -1 })).toBe(2);
    expect(areHexesAdjacent({ q: 0, r: 0 }, { q: 1, r: -1 })).toBe(true);
    expect(areHexesAdjacent({ q: 0, r: 0 }, { q: 1, r: 1 })).toBe(false);
  });

  test('BFS excludes disconnected, hostile, and impassable territory', () => {
    const connected = findConnectedTerritory(
      [
        { q: 0, r: 0, ownerTeamId: 'a' },
        { q: 1, r: 0, ownerTeamId: 'a' },
        { q: 2, r: 0, ownerTeamId: 'a', isPassable: false },
        { q: 3, r: 0, ownerTeamId: 'a' },
        { q: 0, r: 1, ownerTeamId: 'b' },
      ],
      { q: 0, r: 0 },
      'a',
    );

    expect([...connected].sort()).toEqual(['0,0', '1,0']);
  });
});

describe('precise resources and scoring', () => {
  test('settles hourly income without JavaScript floating-point arithmetic', () => {
    const settlement = settleDecimalResource({
      amount: '10',
      incomePerHour: '5',
      lastSettledAt: new Date('2026-07-31T00:00:00.000Z'),
      now: new Date('2026-07-31T00:30:00.000Z'),
    });

    expect(settlement.accruedAmount).toBe('2.5');
    expect(settlement.amount).toBe('12.5');
  });

  test('accepts Decimal-style scientific notation exactly', () => {
    expect(parseDecimal('1e-12')).toEqual({ coefficient: 1n, scale: 12 });
    const settlement = settleDecimalResource({
      amount: '0',
      incomePerHour: '0.36',
      lastSettledAt: new Date('2026-07-31T00:00:00.000Z'),
      now: new Date('2026-07-31T00:00:01.000Z'),
    });
    expect(settlement.amount).toBe('0.0001');
  });

  test('calculates the weighted four-attribute score exactly', () => {
    expect(
      calculateTeamScore(
        {
          gold: '100',
          attributes: {
            strength: '1',
            charisma: '2',
            endurance: '3',
            intelligence: '4',
          },
        },
        defaultCivilizationSettings.scoreWeights,
      ),
    ).toBe('350');
  });
});

describe('tower overlap and rewards', () => {
  test('requires radius-one tower centers to be at least distance three apart', () => {
    expect(
      towerProtectionAreasOverlap(
        { center: { q: 0, r: 0 }, radius: 1 },
        { center: { q: 2, r: 0 }, radius: 1 },
      ),
    ).toBe(true);
    expect(
      towerProtectionAreasOverlap(
        { center: { q: 0, r: 0 }, radius: 1 },
        { center: { q: 3, r: 0 }, radius: 1 },
      ),
    ).toBe(false);
  });

  test('splits integer rewards by stable player order', () => {
    const split = splitIntegerReward(10, ['player-c', 'player-a', 'player-b']);

    expect(split.baseShare).toBe(3);
    expect(split.remainder).toBe(1);
    expect(split.shares).toEqual([
      {
        playerId: 'player-a',
        amount: 4,
        stableOrderIndex: 0,
        receivedRemainderUnit: true,
      },
      {
        playerId: 'player-b',
        amount: 3,
        stableOrderIndex: 1,
        receivedRemainderUnit: false,
      },
      {
        playerId: 'player-c',
        amount: 3,
        stableOrderIndex: 2,
        receivedRemainderUnit: false,
      },
    ]);
  });
});
