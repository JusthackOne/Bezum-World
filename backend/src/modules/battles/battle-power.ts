export interface BattleAttributes {
  strength: number;
  intelligence: number;
  charisma: number;
  endurance: number;
}

export const BATTLES_FORMULA_IDENTIFIER = 'BATTLES';
export const BATTLES_FORMULA_VERSION = 1;

export function calculateBattlesPower(attributes: BattleAttributes): number {
  return (
    attributes.strength * 0.35 +
    attributes.endurance * 0.25 +
    attributes.intelligence * 0.2 +
    attributes.charisma * 0.2
  );
}
