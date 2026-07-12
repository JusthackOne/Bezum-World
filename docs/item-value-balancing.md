# Item Value Balancing

## Coefficients

| Parameter                     | Coefficient |
| ----------------------------- | ----------: |
| Strength                      |      `0.35` |
| Agility                       |      `0.25` |
| Intelligence                  |      `0.20` |
| Charisma                      |      `0.20` |
| Gold per Effective Item Power |        `60` |

In the current Battle logic, an item's `Agility` increases the player's `Endurance`.

## Formula

```text
ItemPower =
  0.35 × Strength
  + 0.25 × Agility
  + 0.20 × Intelligence
  + 0.20 × Charisma
```

Durability modifies the item's economic value:

```text
DurabilityMultiplier = 0.5 + 0.5 × (Durability / 100)
```

`Durability` is clamped to the `0–100` range. If it is missing, use `100`.

```text
EffectiveItemPower = ItemPower × DurabilityMultiplier

ExpectedPriceGold = EffectiveItemPower × 60

ItemBalancePercent = ActualPrice / ExpectedPriceGold × 100
```

Complete formula:

```text
ItemBalancePercent =
  ActualPrice
  / (
      (0.35STR + 0.25AGI + 0.20INT + 0.20CHA)
      × (0.5 + 0.5 × Durability / 100)
      × 60
    )
  × 100
```

## Result Evaluation

| Result       | Evaluation                     |
| ------------ | ------------------------------ |
| Below `75%`  | The item is much too cheap     |
| `75–89%`     | The price is slightly too low  |
| `90–110%`    | The item is balanced           |
| `111–125%`   | The price is slightly too high |
| Above `125%` | The item is much too expensive |

## Example

```text
Price = 870
Strength = 12
Agility = 22
Intelligence = 9
Charisma = 5
Durability = 41

ItemPower = 12.5
DurabilityMultiplier = 0.705
ExpectedPriceGold = 12.5 × 0.705 × 60 = 528.75
ItemBalancePercent = 870 / 528.75 × 100 = 164.54%
```

Result: the item is much too expensive.

> Durability does not currently reduce actual Battle Power in the application. It is used only when calculating the item's economic value.
