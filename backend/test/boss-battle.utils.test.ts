import { describe, expect, test } from 'bun:test';
import { calculateBossDamage, denseRank, getCooldownSlot, resolveReward, validateRewardRanges } from '../src/modules/boss-battles/boss-battle.utils';

describe('Boss Battle pure rules', () => {
  test('uses fixed UTC cooldown slots', () => {
    expect(getCooldownSlot(new Date('2026-07-12T12:37:00.000Z'), 3600).toISOString()).toBe('2026-07-12T12:00:00.000Z');
    expect(getCooldownSlot(new Date('2026-07-12T13:01:00.000Z'), 3600).toISOString()).toBe('2026-07-12T13:00:00.000Z');
  });

  test('damage remains globally bounded for every allowed random edge', () => {
    const weak = { strength: 0, charisma: 0, endurance: 0, intelligence: 0 };
    const strong = { strength: 1_000_000, charisma: 1_000_000, endurance: 1_000_000, intelligence: 1_000_000 };
    expect(calculateBossDamage(weak, strong, 0.9).calculatedDamage).toBeGreaterThanOrEqual(1);
    expect(calculateBossDamage(strong, weak, 1.1).calculatedDamage).toBeLessThanOrEqual(1_000_000);
  });

  test('dense ranking preserves ties', () => {
    expect(denseRank([1000, 1000, 900, 700])).toEqual([1, 1, 2, 3]);
  });

  test('exact rewards take precedence over ranges', () => {
    const rewards = [{ id: 'range', placeFrom: 1, placeTo: 10 }, { id: 'exact', placeFrom: 3, placeTo: 3 }];
    expect(resolveReward(rewards, 3)?.id).toBe('exact');
  });

  test('requires places one through three and rejects ambiguous overlap', () => {
    expect(() => validateRewardRanges([{ placeFrom: 1, placeTo: 3 }])).not.toThrow();
    expect(() => validateRewardRanges([{ placeFrom: 1, placeTo: 1 }, { placeFrom: 2, placeTo: 2 }])).toThrow('REQUIRED_REWARD_PLACE_MISSING:3');
    expect(() => validateRewardRanges([{ placeFrom: 1, placeTo: 3 }, { placeFrom: 2, placeTo: 4 }])).toThrow('REWARD_RANGE_OVERLAP');
  });
});
