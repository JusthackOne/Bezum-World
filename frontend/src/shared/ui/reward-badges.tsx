"use client";

import { BrainIcon, CoinsIcon, DumbbellIcon, ShieldIcon, SparklesIcon } from "lucide-react";
import { type ComponentType } from "react";

import { formatBalance } from "@/shared/lib/item-display";
import { cn } from "@/shared/lib/utils";
import { GameScoreIcon } from "@/shared/ui/game-score-icon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/8bit/tooltip";

export type RewardKind =
  | "strength"
  | "intelligence"
  | "charisma"
  | "endurance"
  | "balance"
  | "gameScore";

export interface RewardBadgeItem {
  kind: RewardKind;
  value: number;
}

interface RewardVisualConfig {
  label: string;
  icon: ComponentType<{ className?: string }>;
  containerClassName: string;
  iconClassName: string;
  valueClassName: string;
  formatValue: (value: number) => string;
}

const rewardVisuals: Record<RewardKind, RewardVisualConfig> = {
  strength: {
    label: "Strength",
    icon: DumbbellIcon,
    containerClassName:
      "border-red-400/65 bg-red-500/8 shadow-[0_0_0_1px_rgba(248,113,113,0.28),0_0_18px_rgba(239,68,68,0.16)]",
    iconClassName: "text-red-400",
    valueClassName: "text-red-100",
    formatValue: (value) => formatBalance(value),
  },
  intelligence: {
    label: "Intelligence",
    icon: BrainIcon,
    containerClassName:
      "border-blue-400/65 bg-blue-500/8 shadow-[0_0_0_1px_rgba(96,165,250,0.28),0_0_18px_rgba(59,130,246,0.16)]",
    iconClassName: "text-blue-400",
    valueClassName: "text-blue-100",
    formatValue: (value) => formatBalance(value),
  },
  charisma: {
    label: "Charisma",
    icon: SparklesIcon,
    containerClassName:
      "border-emerald-400/65 bg-emerald-500/8 shadow-[0_0_0_1px_rgba(52,211,153,0.26),0_0_18px_rgba(16,185,129,0.15)]",
    iconClassName: "text-emerald-400",
    valueClassName: "text-emerald-100",
    formatValue: (value) => formatBalance(value),
  },
  endurance: {
    label: "Endurance",
    icon: ShieldIcon,
    containerClassName:
      "border-violet-400/65 bg-violet-500/8 shadow-[0_0_0_1px_rgba(196,181,253,0.28),0_0_18px_rgba(139,92,246,0.16)]",
    iconClassName: "text-violet-400",
    valueClassName: "text-violet-100",
    formatValue: (value) => formatBalance(value),
  },
  balance: {
    label: "Balance",
    icon: CoinsIcon,
    containerClassName:
      "border-amber-400/70 bg-[linear-gradient(120deg,rgba(250,204,21,0.13),rgba(251,191,36,0.08))] shadow-[0_0_0_1px_rgba(245,158,11,0.26),0_0_18px_rgba(245,158,11,0.18)]",
    iconClassName: "text-amber-300",
    valueClassName: "bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent",
    formatValue: (value) => formatBalance(value),
  },
  gameScore: {
    label: "GameScore",
    icon: GameScoreIcon,
    containerClassName:
      "border-fuchsia-400/60 bg-[linear-gradient(120deg,rgba(244,114,182,0.12),rgba(96,165,250,0.12),rgba(52,211,153,0.12),rgba(250,204,21,0.12))] shadow-[0_0_0_1px_rgba(217,70,239,0.25),0_0_20px_rgba(59,130,246,0.18)]",
    iconClassName: "text-fuchsia-300",
    valueClassName:
      "bg-gradient-to-r from-fuchsia-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent",
    formatValue: (value) => formatBalance(value),
  },
};

interface RewardBadgeProps {
  reward: RewardBadgeItem;
  showPlusSign?: boolean;
  className?: string;
}

export function RewardBadge({ reward, showPlusSign = true, className }: RewardBadgeProps) {
  const visual = rewardVisuals[reward.kind];
  const Icon = visual.icon;
  const formattedValue = visual.formatValue(reward.value);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold tabular-nums",
            visual.containerClassName,
            className,
          )}
        >
          <Icon className={cn("size-4 shrink-0", visual.iconClassName)} />
          <span className={visual.valueClassName}>
            {showPlusSign ? "+" : ""}
            {formattedValue}
          </span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {visual.label}
      </TooltipContent>
    </Tooltip>
  );
}

interface RewardBadgesListProps {
  rewards: RewardBadgeItem[];
  emptyLabel?: string;
  showPlusSign?: boolean;
  className?: string;
}

export function RewardBadgesList({
  rewards,
  emptyLabel = "No rewards",
  showPlusSign = true,
  className,
}: RewardBadgesListProps) {
  if (rewards.length === 0) {
    return <span className="text-muted-foreground text-sm">{emptyLabel}</span>;
  }

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap gap-2", className)}>
        {rewards.map((reward) => (
          <RewardBadge
            key={`${reward.kind}-${reward.value}`}
            reward={reward}
            showPlusSign={showPlusSign}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}

