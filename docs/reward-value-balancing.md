# Reward Value Balancing Guide

## Purpose

This model converts Gold, Game Score, and permanent player attributes into a shared unit called `Reward Value` (`RV`). A task reward can then be compared with the target value for its task type.

The model is intended for an initial balance check. It does not replace analysis of actual player progression data.

## Attribute Weight Source

The attribute weights come from Battle Power formula version 1:

```text
Battle Power =
    Strength × 0.35
  + Endurance × 0.25
  + Intelligence × 0.20
  + Charisma × 0.20
```

Source: `backend/src/modules/battles/battle-power.ts`.

The following scale is used to keep the calculations in whole numbers:

```text
1 Battle Power = 1,000 RV
```

This scale does not change the relative attribute weights.

## Reward Coefficients

| Reward component | RV coefficient | Basis                                      |
| ---------------- | -------------: | ------------------------------------------ |
| Gold             |              1 | Base economic unit                         |
| Game Score       |             10 | Configurable ratio: 1 Game Score = 10 Gold |
| Strength         |            350 | `0.35 × 1,000`                             |
| Endurance        |            250 | `0.25 × 1,000`                             |
| Intelligence     |            200 | `0.20 × 1,000`                             |
| Charisma         |            200 | `0.20 × 1,000`                             |

One point of Strength is worth `1.75` times one point of Intelligence or Charisma because that ratio is used by the Battle formula.

## Actual Reward Value Formula

```text
ActualRV =
    Gold × 1
  + GameScore × 10
  + Strength × 350
  + Endurance × 250
  + Intelligence × 200
  + Charisma × 200
```

Short form:

```text
ActualRV = G + 10GS + 350STR + 250END + 200INT + 200CHA
```

Every missing reward component is treated as zero.

## Task-Type Multipliers

| Task type | Multiplier |
| --------- | ---------: |
| Daily     |          1 |
| Weekly    |          7 |
| Event     |         14 |

Event uses `14` because it is worth two Weekly tasks:

```text
7 × 2 = 14
```

## Target Value

The initial target value for one balanced Daily task is:

```text
DailyBaseRV = 500
```

Calculate the target value as follows:

```text
TargetRV = DailyBaseRV × TaskTypeMultiplier
```

With a base value of `500 RV`, the targets are:

| Task type | Target RV |
| --------- | --------: |
| Daily     |       500 |
| Weekly    |     3,500 |
| Event     |     7,000 |

## Balance Formula

```text
BalancePercent = ActualRV / TargetRV × 100
```

Complete expression:

```text
BalancePercent =
  (G + 10GS + 350STR + 250END + 200INT + 200CHA)
  / (DailyBaseRV × TaskTypeMultiplier)
  × 100
```

## Result Evaluation

| Balance Percent | Evaluation                  |
| --------------- | --------------------------- |
| Below `75%`     | Reward is much too low      |
| `75–89%`        | Reward is slightly too low  |
| `90–110%`       | Reward is balanced          |
| `111–125%`      | Reward is slightly too high |
| Above `125%`    | Reward is much too high     |

## Weekly Task Example

Reward:

```text
2,000 Gold
50 Game Score
+2 Strength
+1 Intelligence
+1 Endurance
```

Actual value:

```text
ActualRV = 2,000 + 50×10 + 2×350 + 1×200 + 1×250
ActualRV = 3,650 RV
```

Weekly target value:

```text
TargetRV = 500 × 7 = 3,500 RV
```

Balance result:

```text
BalancePercent = 3,650 / 3,500 × 100 = 104.29%
```

The result is within the `90–110%` range, so the reward is balanced.

## Model Maintenance

Attribute weights must be updated whenever the Battle Power formula changes. If `BATTLES_FORMULA_VERSION` changes, review this document as well.

The Gold, Game Score, and `DailyBaseRV` coefficients do not come from Battle Power. They are configurable economy parameters and should be adjusted using:

- average rewards per completed task;
- average tasks completed per day;
- Gold and Game Score accumulation speed;
- permanent attribute progression speed;
- reward impact on PvP and Boss Battle;
- percentage of tasks outside the `90–110%` range.

If all attribute coefficients are rescaled, `DailyBaseRV` must be rescaled by the same proportion.
