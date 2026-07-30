import { describe, expect, test } from 'bun:test';

import {
  calculateBattleWinProbability,
  calculateBattlesPower,
  FEATURED_ATTRIBUTE_MULTIPLIER,
  type FeaturedBattleAttribute,
} from '../src/modules/battles/battle-power';

describe('calculateBattlesPower', () => {
  const attributes = {
    strength: 10,
    charisma: 20,
    endurance: 30,
    intelligence: 40,
  };

  test.each<FeaturedBattleAttribute>(['strength', 'charisma', 'endurance', 'intelligence'])(
    'weights only the %s attribute by the featured multiplier',
    (featuredAttribute) => {
      const expectedPower =
        100 + attributes[featuredAttribute] * (FEATURED_ATTRIBUTE_MULTIPLIER - 1);

      expect(calculateBattlesPower(attributes, featuredAttribute)).toBeCloseTo(expectedPower, 10);
    },
  );
});

describe('calculateBattleWinProbability', () => {
  test('returns complementary chances for both views of the same battle', () => {
    const playerPower = 148;
    const opponentPower = 121;

    const playerChance = calculateBattleWinProbability(playerPower, opponentPower);
    const opponentChance = calculateBattleWinProbability(opponentPower, playerPower);

    expect(playerChance + opponentChance).toBeCloseTo(1, 10);
  });
});
