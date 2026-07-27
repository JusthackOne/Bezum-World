export interface ItemBalanceInput {
  price?: unknown;
  strength?: unknown;
  agility?: unknown;
  intelligence?: unknown;
  charisma?: unknown;
  durability?: unknown;
}

export interface ItemBalanceResult {
  expectedPrice: number;
  balancePercent: number;
}

export const ITEM_ATTRIBUTE_BALANCE_COEFFICIENT = 0.25;
const GOLD_PER_EFFECTIVE_ITEM_POWER = 4;

function numericValue(value: unknown): number {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function calculateItemBalance(input: ItemBalanceInput): ItemBalanceResult {
  const itemPower =
    (numericValue(input.strength) +
      numericValue(input.agility) +
      numericValue(input.intelligence) +
      numericValue(input.charisma)) *
    ITEM_ATTRIBUTE_BALANCE_COEFFICIENT;
  const parsedDurability =
    input.durability === "" || input.durability === null || input.durability === undefined
      ? 100
      : numericValue(input.durability);
  const clampedDurability = Math.min(100, Math.max(0, parsedDurability));
  const durabilityMultiplier = 0.5 + 0.5 * (clampedDurability / 100);
  const expectedPrice = itemPower * durabilityMultiplier * GOLD_PER_EFFECTIVE_ITEM_POWER;
  const actualPrice = numericValue(input.price);
  const balancePercent =
    expectedPrice > 0 ? (actualPrice / expectedPrice) * 100 : actualPrice > 0 ? Infinity : 0;

  return {
    expectedPrice,
    balancePercent,
  };
}

export function getItemBalanceDescription(balancePercent: number): string {
  if (balancePercent < 75) return "The item is much too cheap";
  if (balancePercent < 90) return "The price is slightly too low";
  if (balancePercent <= 110) return "The item is balanced";
  if (balancePercent <= 125) return "The price is slightly too high";
  return "The item is much too expensive";
}
