import { describe, expect, test } from 'bun:test';
import {
  calculateBossDamage,
  denseRank,
  getBossAttackMultiplier,
  getCooldownSlot,
  resolveReward,
  validateRewardRanges,
} from '../src/modules/boss-battles/boss-battle.utils';

describe('Boss Battle pure rules', () => {
  test('uses fixed UTC cooldown slots', () => {
    expect(getCooldownSlot(new Date('2026-07-12T12:37:00.000Z'), 3600).toISOString()).toBe(
      '2026-07-12T12:00:00.000Z',
    );
    expect(getCooldownSlot(new Date('2026-07-12T13:01:00.000Z'), 3600).toISOString()).toBe(
      '2026-07-12T13:00:00.000Z',
    );
  });

  test('normal attacks deal exactly the configured default damage', () => {
    expect(getBossAttackMultiplier('NORMAL', () => 0.75)).toBe(1);
    expect(calculateBossDamage(275, 1)).toBe(275);
  });

  test('Super Attack ranges from 0.8x to 1.8x with a 1.3x midpoint', () => {
    expect(getBossAttackMultiplier('SUPER', () => 0)).toBe(0.8);
    expect(getBossAttackMultiplier('SUPER', () => 0.5)).toBe(1.3);
    expect(getBossAttackMultiplier('SUPER', () => 1)).toBe(1.8);
    expect(calculateBossDamage(100, 0.8)).toBe(80);
    expect(calculateBossDamage(100, 1.3)).toBe(130);
    expect(calculateBossDamage(100, 1.8)).toBe(180);
  });

  test('rejects Super Attack multipliers outside the configured range', () => {
    expect(() => calculateBossDamage(100, 0.79)).toThrow('between 0.8 and 1.8');
    expect(() => calculateBossDamage(100, 1.81)).toThrow('between 0.8 and 1.8');
  });

  test('dense ranking preserves ties', () => {
    expect(denseRank([1000, 1000, 900, 700])).toEqual([1, 1, 2, 3]);
  });

  test('exact rewards take precedence over ranges', () => {
    const rewards = [
      { id: 'range', placeFrom: 1, placeTo: 10 },
      { id: 'exact', placeFrom: 3, placeTo: 3 },
    ];
    expect(resolveReward(rewards, 3)?.id).toBe('exact');
  });

  test('requires places one through three and rejects ambiguous overlap', () => {
    expect(() => validateRewardRanges([{ placeFrom: 1, placeTo: 3 }])).not.toThrow();
    expect(() =>
      validateRewardRanges([
        { placeFrom: 1, placeTo: 1 },
        { placeFrom: 2, placeTo: 2 },
      ]),
    ).toThrow('REQUIRED_REWARD_PLACE_MISSING:3');
    expect(() =>
      validateRewardRanges([
        { placeFrom: 1, placeTo: 3 },
        { placeFrom: 2, placeTo: 4 },
      ]),
    ).toThrow('REWARD_RANGE_OVERLAP');
  });
});
