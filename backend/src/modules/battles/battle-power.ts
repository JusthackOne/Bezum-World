export interface BattleAttributes {
  strength: number;
  intelligence: number;
  charisma: number;
  endurance: number;
}

export const BATTLES_FORMULA_IDENTIFIER = 'BATTLES';
export const BATTLES_FORMULA_VERSION = 2;
export const FEATURED_ATTRIBUTE_MULTIPLIER = 1.6;

export type FeaturedBattleAttribute = keyof BattleAttributes;

export function calculateBattlesPower(
  attributes: BattleAttributes,
  featuredAttribute: FeaturedBattleAttribute,
): number {
  const basePower =
    attributes.strength +
    attributes.endurance +
    attributes.intelligence +
    attributes.charisma;

  return (
    basePower +
    attributes[featuredAttribute] * (FEATURED_ATTRIBUTE_MULTIPLIER - 1)
  );
}

export function calculateBattleWinProbability(
  playerPower: number,
  opponentPower: number,
): number {
  const delta = playerPower - opponentPower;

  return 1 / (1 + Math.exp(-delta / 20));
}
