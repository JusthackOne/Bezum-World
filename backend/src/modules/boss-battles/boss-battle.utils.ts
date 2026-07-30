export type BossAttackType = 'NORMAL' | 'SUPER';

export const SUPER_ATTACK_MIN_MULTIPLIER = 1;
export const SUPER_ATTACK_MAX_MULTIPLIER = 2.5;

export function getCooldownSlot(timestamp: Date, cooldownSeconds: number): Date {
  if (!Number.isInteger(cooldownSeconds) || cooldownSeconds <= 0) {
    throw new RangeError('cooldownSeconds must be a positive integer');
  }
  const unixSeconds = Math.floor(timestamp.getTime() / 1000);
  return new Date(Math.floor(unixSeconds / cooldownSeconds) * cooldownSeconds * 1000);
}

export function getBossAttackMultiplier(
  attackType: BossAttackType,
  random: () => number = Math.random,
): number {
  if (attackType === 'NORMAL') return 1;
  const randomValue = random();
  if (!Number.isFinite(randomValue) || randomValue < 0 || randomValue > 1) {
    throw new RangeError('random must return a number between 0 and 1');
  }
  const minHundredths = SUPER_ATTACK_MIN_MULTIPLIER * 100;
  const maxHundredths = SUPER_ATTACK_MAX_MULTIPLIER * 100;
  const possibleValues = maxHundredths - minHundredths + 1;
  const offset = Math.min(Math.floor(randomValue * possibleValues), possibleValues - 1);
  return (minHundredths + offset) / 100;
}

export function calculateBossDamage(defaultDamage: number, multiplier: number): number {
  if (!Number.isInteger(defaultDamage) || defaultDamage <= 0) {
    throw new RangeError('defaultDamage must be a positive integer');
  }
  if (multiplier < SUPER_ATTACK_MIN_MULTIPLIER || multiplier > SUPER_ATTACK_MAX_MULTIPLIER) {
    throw new RangeError('multiplier must be between 1 and 2.5');
  }
  return Math.round(defaultDamage * multiplier);
}

export interface RewardRange {
  id?: string;
  placeFrom: number;
  placeTo: number;
}

export function validateRewardRanges(rewards: RewardRange[]): void {
  for (const place of [1, 2, 3]) {
    if (!rewards.some((reward) => reward.placeFrom <= place && reward.placeTo >= place)) {
      throw new Error(`REQUIRED_REWARD_PLACE_MISSING:${place}`);
    }
  }
  for (let index = 0; index < rewards.length; index += 1) {
    const left = rewards[index];
    if (!left) continue;
    for (let otherIndex = index + 1; otherIndex < rewards.length; otherIndex += 1) {
      const right = rewards[otherIndex];
      if (!right) continue;
      const overlaps = left.placeFrom <= right.placeTo && right.placeFrom <= left.placeTo;
      const exactPrecedence =
        (left.placeFrom === left.placeTo && right.placeFrom !== right.placeTo) ||
        (right.placeFrom === right.placeTo && left.placeFrom !== left.placeTo);
      if (overlaps && !exactPrecedence) throw new Error('REWARD_RANGE_OVERLAP');
    }
  }
}

export function resolveReward<T extends RewardRange>(rewards: T[], place: number): T | undefined {
  return rewards
    .filter((reward) => reward.placeFrom <= place && reward.placeTo >= place)
    .sort((left, right) => {
      const leftExact = left.placeFrom === left.placeTo;
      const rightExact = right.placeFrom === right.placeTo;
      if (leftExact !== rightExact) return leftExact ? -1 : 1;
      return left.placeTo - left.placeFrom - (right.placeTo - right.placeFrom);
    })[0];
}

export function denseRank(damages: number[]): number[] {
  let place = 0;
  let previous: number | undefined;
  return damages.map((damage) => {
    if (damage !== previous) place += 1;
    previous = damage;
    return place;
  });
}
