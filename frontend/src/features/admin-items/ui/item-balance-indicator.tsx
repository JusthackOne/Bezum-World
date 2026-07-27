import { BalanceIndicator } from "@/shared/ui";

import {
  calculateItemBalance,
  getItemBalanceDescription,
  type ItemBalanceInput,
} from "../model/item-balance";

type ItemBalanceIndicatorProps = ItemBalanceInput;

export function ItemBalanceIndicator({
  price,
  strength,
  agility,
  intelligence,
  charisma,
  durability,
}: ItemBalanceIndicatorProps) {
  const { balancePercent } = calculateItemBalance({
    price,
    strength,
    agility,
    intelligence,
    charisma,
    durability,
  });
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
