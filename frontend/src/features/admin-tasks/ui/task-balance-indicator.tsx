import { BalanceIndicator } from "@/shared/ui";

type TaskType = "daily" | "weekly" | "event";

interface TaskBalanceIndicatorProps {
  type: TaskType;
  rewardMoney?: unknown;
  rewardGameScore?: unknown;
  rewardStrength?: unknown;
  rewardEndurance?: unknown;
  rewardIntelligence?: unknown;
  rewardCharisma?: unknown;
}

const taskTypeMultipliers: Record<TaskType, number> = {
  daily: 1,
  weekly: 7,
  event: 14,
};

const REWARD_VALUE_SCALE = 1_000;
const rewardCoefficients = {
  gold: 0.1,
  gameScore: 0.25,
  strength: 0.25,
  endurance: 0.25,
  intelligence: 0.25,
  charisma: 0.25,
} as const;

function rewardValue(value: unknown): number {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : 0;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function getBalanceDescription(balancePercent: number): string {
  if (balancePercent < 75) return "Reward is much too low";
  if (balancePercent < 90) return "Reward is slightly too low";
  if (balancePercent <= 110) return "Reward is balanced";
  if (balancePercent <= 125) return "Reward is slightly too high";
  return "Reward is much too high";
}

export function TaskBalanceIndicator({
  type,
  rewardMoney,
  rewardGameScore,
  rewardStrength,
  rewardEndurance,
  rewardIntelligence,
  rewardCharisma,
}: TaskBalanceIndicatorProps) {
  const actualRewardValue =
    (rewardValue(rewardMoney) * rewardCoefficients.gold +
      rewardValue(rewardGameScore) * rewardCoefficients.gameScore +
      rewardValue(rewardStrength) * rewardCoefficients.strength +
      rewardValue(rewardEndurance) * rewardCoefficients.endurance +
      rewardValue(rewardIntelligence) * rewardCoefficients.intelligence +
      rewardValue(rewardCharisma) * rewardCoefficients.charisma) *
    REWARD_VALUE_SCALE;
  const targetRewardValue = 2_000 * taskTypeMultipliers[type];
  const balancePercent = (actualRewardValue / targetRewardValue) * 100;
  const description = getBalanceDescription(balancePercent);

  return (
    <BalanceIndicator
      title="Task Balance"
      balancePercent={balancePercent}
      description={description}
      ariaLabel="Task reward balance"
    />
  );
}
