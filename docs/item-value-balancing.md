# Item Value Balancing

## Coefficients

| Parameter                     | Coefficient |
| ----------------------------- | ----------: |
| Strength                      |      `0.25` |
| Agility                       |      `0.25` |
| Intelligence                  |      `0.25` |
| Charisma                      |      `0.25` |
| Gold per Effective Item Power |         `4` |

All four item attributes deliberately have the same economic-value coefficient, and their
coefficients sum to `1`. This does not change the separate Battle Power formula.

In the current Battle logic, an item's `Agility` increases the player's `Endurance`.

## Formula

```text
ItemPower =
  0.25 × Strength
  + 0.25 × Agility
  + 0.25 × Intelligence
  + 0.25 × Charisma
```

Durability modifies the item's economic value:

```text
DurabilityMultiplier = 0.5 + 0.5 × (Durability / 100)
```

`Durability` is clamped to the `0–100` range. If it is missing, use `100`.

```text
EffectiveItemPower = ItemPower × DurabilityMultiplier

ExpectedPriceGold = EffectiveItemPower × 4

ItemBalancePercent = ActualPrice / ExpectedPriceGold × 100
```

Complete formula:

```text
ItemBalancePercent =
  ActualPrice
  / (
      (0.25STR + 0.25AGI + 0.25INT + 0.25CHA)
      × (0.5 + 0.5 × Durability / 100)
      × 4
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

ItemPower = 12
DurabilityMultiplier = 0.705
ExpectedPriceGold = 12 × 0.705 × 4 = 33.84
ItemBalancePercent = 870 / 33.84 × 100 = 2,570.92%
```

Result: the item is much too expensive.

> Durability does not currently reduce actual Battle Power in the application. It is used only when calculating the item's economic value.
