import { z } from 'zod';

const canonicalNonNegativeDecimalPattern = /^(?:0|[1-9]\d{0,17})(?:\.\d{0,11}[1-9])?$/;

export const civilizationDecimalStringSchema = z
  .string()
  .regex(
    canonicalNonNegativeDecimalPattern,
    'Expected a canonical non-negative decimal with at most 18 integer and 12 fractional digits',
  );

const nonNegativeIntegerSchema = z.number().int().nonnegative();
const positiveIntegerSchema = z.number().int().positive();

const attributeDecimalRecordSchema = z
  .object({
    strength: civilizationDecimalStringSchema,
    charisma: civilizationDecimalStringSchema,
    endurance: civilizationDecimalStringSchema,
    intelligence: civilizationDecimalStringSchema,
  })
  .strict();

export const civilizationSettingsSchema = z
  .object({
    actionPoints: z
      .object({
        maximumUnits: positiveIntegerSchema,
        initialUnits: nonNegativeIntegerSchema,
        regenerationUnits: positiveIntegerSchema,
        regenerationIntervalMinutes: positiveIntegerSchema,
      })
      .strict(),
    costs: z
      .object({
        ownedMoveUnits: nonNegativeIntegerSchema,
        otherMoveUnits: nonNegativeIntegerSchema,
        attackPlayerUnits: nonNegativeIntegerSchema,
        buildingCaptureUnits: nonNegativeIntegerSchema,
        towerAttackUnits: nonNegativeIntegerSchema,
        townHallCaptureUnits: nonNegativeIntegerSchema,
        townHallDefenseUnits: nonNegativeIntegerSchema,
        towerRepairUnits: nonNegativeIntegerSchema,
      })
      .strict(),
    territoryGoldPerHour: civilizationDecimalStringSchema,
    goldBuildingIncomePerHour: civilizationDecimalStringSchema,
    attributeBuildingIncomePerHour: attributeDecimalRecordSchema,
    buildingCapture: z
      .object({
        requiredUnits: positiveIntegerSchema,
        contributionUnits: positiveIntegerSchema,
      })
      .strict(),
    combat: z
      .object({
        attackerWinPercent: z.number().min(0).max(100),
        defenderWinPercent: z.number().min(0).max(100),
      })
      .strict(),
    tower: z
      .object({
        buildGoldCost: civilizationDecimalStringSchema,
        constructionMinutes: nonNegativeIntegerSchema,
        repairMinutes: nonNegativeIntegerSchema,
        protectionRadius: nonNegativeIntegerSchema,
        repairGoldCost: civilizationDecimalStringSchema,
      })
      .strict(),
    townHall: z
      .object({
        captureRequiredUnits: positiveIntegerSchema,
        contributionUnits: positiveIntegerSchema,
        defenseReductionUnits: positiveIntegerSchema,
        defenseGoldCost: civilizationDecimalStringSchema,
      })
      .strict(),
    scoreWeights: z
      .object({
        gold: civilizationDecimalStringSchema,
        strength: civilizationDecimalStringSchema,
        charisma: civilizationDecimalStringSchema,
        endurance: civilizationDecimalStringSchema,
        intelligence: civilizationDecimalStringSchema,
      })
      .strict(),
    winnerBonus: civilizationDecimalStringSchema,
  })
  .strict()
  .superRefine((settings, context) => {
    if (settings.actionPoints.initialUnits > settings.actionPoints.maximumUnits) {
      context.addIssue({
        code: 'custom',
        message: 'Initial action points cannot exceed the maximum',
        path: ['actionPoints', 'initialUnits'],
      });
    }

    if (settings.combat.attackerWinPercent + settings.combat.defenderWinPercent !== 100) {
      context.addIssue({
        code: 'custom',
        message: 'Combat probabilities must total 100 percent',
        path: ['combat'],
      });
    }

    if (settings.buildingCapture.contributionUnits > settings.buildingCapture.requiredUnits) {
      context.addIssue({
        code: 'custom',
        message: 'Building capture contribution cannot exceed required progress',
        path: ['buildingCapture', 'contributionUnits'],
      });
    }

    if (settings.townHall.contributionUnits > settings.townHall.captureRequiredUnits) {
      context.addIssue({
        code: 'custom',
        message: 'Town-hall contribution cannot exceed required progress',
        path: ['townHall', 'contributionUnits'],
      });
    }

    if (settings.townHall.defenseReductionUnits > settings.townHall.captureRequiredUnits) {
      context.addIssue({
        code: 'custom',
        message: 'Town-hall defense reduction cannot exceed required progress',
        path: ['townHall', 'defenseReductionUnits'],
      });
    }
  });

export type CivilizationSettings = z.infer<typeof civilizationSettingsSchema>;

export const defaultCivilizationSettings = {
  actionPoints: {
    maximumUnits: 16,
    initialUnits: 16,
    regenerationUnits: 2,
    regenerationIntervalMinutes: 180,
  },
  costs: {
    ownedMoveUnits: 1,
    otherMoveUnits: 2,
    attackPlayerUnits: 4,
    buildingCaptureUnits: 2,
    towerAttackUnits: 6,
    townHallCaptureUnits: 2,
    townHallDefenseUnits: 2,
    towerRepairUnits: 2,
  },
  territoryGoldPerHour: '5',
  goldBuildingIncomePerHour: '25',
  attributeBuildingIncomePerHour: {
    strength: '1',
    charisma: '1',
    endurance: '1',
    intelligence: '1',
  },
  buildingCapture: {
    requiredUnits: 6,
    contributionUnits: 2,
  },
  combat: {
    attackerWinPercent: 30,
    defenderWinPercent: 70,
  },
  tower: {
    buildGoldCost: '200',
    constructionMinutes: 180,
    repairMinutes: 0,
    protectionRadius: 1,
    repairGoldCost: '75',
  },
  townHall: {
    captureRequiredUnits: 16,
    contributionUnits: 2,
    defenseReductionUnits: 1,
    defenseGoldCost: '50',
  },
  scoreWeights: {
    gold: '1',
    strength: '25',
    charisma: '25',
    endurance: '25',
    intelligence: '25',
  },
  winnerBonus: '0',
} satisfies CivilizationSettings;

export function parseCivilizationSettings(input: unknown): CivilizationSettings {
  return civilizationSettingsSchema.parse(input);
}
