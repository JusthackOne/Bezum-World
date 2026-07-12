import { BalanceIndicator } from "@/shared/ui";

interface ItemBalanceIndicatorProps {
  price?: unknown;
  strength?: unknown;
  agility?: unknown;
  intelligence?: unknown;
  charisma?: unknown;
  durability?: unknown;
}

function numericValue(value: unknown): number {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getItemBalanceDescription(balancePercent: number): string {
  if (balancePercent < 75) return "The item is much too cheap";
  if (balancePercent < 90) return "The price is slightly too low";
  if (balancePercent <= 110) return "The item is balanced";
  if (balancePercent <= 125) return "The price is slightly too high";
  return "The item is much too expensive";
}

export function ItemBalanceIndicator({
  price,
  strength,
  agility,
  intelligence,
  charisma,
  durability,
}: ItemBalanceIndicatorProps) {
  const itemPower =
    numericValue(strength) * 0.35 +
    numericValue(agility) * 0.25 +
    numericValue(intelligence) * 0.2 +
    numericValue(charisma) * 0.2;
  const parsedDurability =
    durability === "" || durability === null || durability === undefined
      ? 100
      : numericValue(durability);
  const clampedDurability = Math.min(100, Math.max(0, parsedDurability));
  const durabilityMultiplier = 0.5 + 0.5 * (clampedDurability / 100);
  const expectedPrice = itemPower * durabilityMultiplier * 4;
  const actualPrice = numericValue(price);
  const balancePercent =
    expectedPrice > 0 ? (actualPrice / expectedPrice) * 100 : actualPrice > 0 ? Infinity : 0;
  const description = getItemBalanceDescription(balancePercent);

  return (
    <BalanceIndicator
      title="Item Balance"
      balancePercent={balancePercent}
      description={description}
      ariaLabel="Item price balance"
    />
  );
}
