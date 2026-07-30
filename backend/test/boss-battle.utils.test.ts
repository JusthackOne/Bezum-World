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

  test('Super Attack multiplier includes both edges and is rounded to two decimals', () => {
    expect(getBossAttackMultiplier('SUPER', () => 0)).toBe(1);
    expect(getBossAttackMultiplier('SUPER', () => 0.58)).toBe(1.87);
    expect(getBossAttackMultiplier('SUPER', () => 1)).toBe(2.5);
    expect(calculateBossDamage(100, 1.87)).toBe(187);
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
