# Reward Value Balancing Guide

## Purpose

This model converts Gold, Game Score, and permanent player attributes into a shared unit called `Reward Value` (`RV`). A task reward can then be compared with the target value for its task type.

The model is intended for an initial balance check. It does not replace analysis of actual player progression data.

## Attribute Weights

Task reward attributes use the same equal weighting as Item Value Balancing:

```text
Task Attribute Value =
    Strength × 0.25
  + Endurance × 0.25
  + Intelligence × 0.25
  + Charisma × 0.25
```

These task-economy weights are independent from the separate Battle Power formula.

The following scale is used to keep the calculations in whole numbers:

```text
1 normalized reward-value unit = 1000 RV
```

This scale does not change the relative attribute weights.

## Reward Coefficients

| Reward component | RV coefficient | Basis                                       |
| ---------------- | -------------: | ------------------------------------------- |
| Gold             |            100 | `0.10 × 1,000` configured economy weight    |
| Game Score       |            250 | Configured economy weight                   |
| Strength         |            250 | `0.25 × 1,000`                              |
| Endurance        |            250 | `0.25 × 1,000`                              |
| Intelligence     |            250 | `0.25 × 1,000`                              |
| Charisma         |            250 | `0.25 × 1,000`                              |

The four attribute coefficients sum to `1,000 RV`, so every permanent attribute point has the
same task reward value.

## Actual Reward Value Formula

```text
ActualRV =
    Gold × 100
  + GameScore × 250
  + Strength × 250
  + Endurance × 250
  + Intelligence × 250
  + Charisma × 250
```

Short form:

```text
ActualRV = 100G + 250GS + 250STR + 250END + 250INT + 250CHA
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
DailyBaseRV = 2,000
```

Calculate the target value as follows:

```text
TargetRV = DailyBaseRV × TaskTypeMultiplier
```

With a base value of `2,000 RV`, the targets are:

| Task type | Target RV |
| --------- | --------: |
| Daily     |     2,000 |
| Weekly    |    14,000 |
| Event     |    28,000 |

## Balance Formula

```text
BalancePercent = ActualRV / TargetRV × 100
```

Complete expression:

```text
BalancePercent =
  (100G + 250GS + 250STR + 250END + 250INT + 250CHA)
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
4 Gold
28 Game Score
+8 Strength
+4 Intelligence
+4 Endurance
```

Actual value:

```text
ActualRV = 4×100 + 28×250 + 8×250 + 4×250 + 4×250
ActualRV = 11,400 RV
```

Weekly target value:

```text
TargetRV = 2,000 × 7 = 14,000 RV
```

Balance result:

```text
BalancePercent = 11,400 / 14,000 × 100 = 81.43%
```

The result is within the `75–89%` range, so the reward is slightly too low.

## Model Maintenance

Task attribute weights are intentionally aligned with `docs/item-value-balancing.md`. If those
economic weights change, review this document and the task balance indicator together.

Gold, Game Score, attribute weights, and `DailyBaseRV` are configurable economy parameters and
should be adjusted using:

- average rewards per completed task;
- average tasks completed per day;
- Gold and Game Score accumulation speed;
- permanent attribute progression speed;
- reward impact on PvP and Boss Battle;
- percentage of tasks outside the `90–110%` range.

If all attribute coefficients are rescaled, `DailyBaseRV` must be rescaled by the same proportion.
