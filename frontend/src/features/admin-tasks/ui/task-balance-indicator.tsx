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
    rewardValue(rewardMoney) * 600 +
    rewardValue(rewardGameScore) * 250 +
    rewardValue(rewardStrength) * 350 +
    rewardValue(rewardEndurance) * 250 +
    rewardValue(rewardIntelligence) * 200 +
    rewardValue(rewardCharisma) * 200;
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
