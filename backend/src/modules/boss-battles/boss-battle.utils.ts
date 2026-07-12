import { calculateBattlesPower, type BattleAttributes } from '../battles/battle-power';

export const MIN_BOSS_DAMAGE = 1;
export const MAX_BOSS_DAMAGE = 1_000_000;
export const BOSS_BASE_DAMAGE = 100;
const MIN_POWER_RATIO = 0.1;
const MAX_POWER_RATIO = 10;

export function getCooldownSlot(timestamp: Date, cooldownSeconds: number): Date {
  if (!Number.isInteger(cooldownSeconds) || cooldownSeconds <= 0) {
    throw new RangeError('cooldownSeconds must be a positive integer');
  }
  const unixSeconds = Math.floor(timestamp.getTime() / 1000);
  return new Date(Math.floor(unixSeconds / cooldownSeconds) * cooldownSeconds * 1000);
}

export function calculateBossDamage(
  userAttributes: BattleAttributes,
  bossAttributes: BattleAttributes,
  randomMultiplier: number,
): { calculatedDamage: number; userPower: number; bossPower: number } {
  if (randomMultiplier < 0.9 || randomMultiplier > 1.1) {
    throw new RangeError('randomMultiplier must be between 0.9 and 1.1');
  }
  const userPower = calculateBattlesPower(userAttributes);
  const bossPower = calculateBattlesPower(bossAttributes);
  const ratio = Math.max(
    MIN_POWER_RATIO,
    Math.min(MAX_POWER_RATIO, userPower / Math.max(1, bossPower)),
  );
  const damage = Math.round(BOSS_BASE_DAMAGE * ratio * randomMultiplier);
  return {
    userPower,
    bossPower,
    calculatedDamage: Math.max(MIN_BOSS_DAMAGE, Math.min(MAX_BOSS_DAMAGE, damage)),
  };
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
