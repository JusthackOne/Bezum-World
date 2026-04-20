"use client";

import { BrainIcon, DumbbellIcon, ShieldIcon, SparklesIcon, type LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/8bit/tooltip";

export type PlayerAttributeKey = "strength" | "charisma" | "endurance" | "intelligence";

interface AttributeVisual {
  label: string;
  icon: LucideIcon;
  accentClassName: string;
  iconClassName: string;
}

export const attributeVisuals: Record<PlayerAttributeKey, AttributeVisual> = {
  strength: {
    label: "Strength",
    icon: DumbbellIcon,
    accentClassName:
      "border-red-400/65 bg-red-500/8 shadow-[0_0_0_1px_rgba(248,113,113,0.28),0_0_18px_rgba(239,68,68,0.16)]",
    iconClassName: "text-red-400",
  },
  intelligence: {
    label: "Intelligence",
    icon: BrainIcon,
    accentClassName:
      "border-blue-400/65 bg-blue-500/8 shadow-[0_0_0_1px_rgba(96,165,250,0.28),0_0_18px_rgba(59,130,246,0.16)]",
    iconClassName: "text-blue-400",
  },
  charisma: {
    label: "Charisma",
    icon: SparklesIcon,
    accentClassName:
      "border-emerald-400/65 bg-emerald-500/8 shadow-[0_0_0_1px_rgba(52,211,153,0.26),0_0_18px_rgba(16,185,129,0.15)]",
    iconClassName: "text-emerald-400",
  },
  endurance: {
    label: "Endurance",
    icon: ShieldIcon,
    accentClassName:
      "border-violet-400/65 bg-violet-500/8 shadow-[0_0_0_1px_rgba(196,181,253,0.28),0_0_18px_rgba(139,92,246,0.16)]",
    iconClassName: "text-violet-400",
  },
};

interface AttributeBadgeProps {
  attribute: PlayerAttributeKey;
  value: number;
  tooltipLabel?: string;
  className?: string;
}

export function AttributeBadge({ attribute, value, tooltipLabel, className }: AttributeBadgeProps) {
  const visual = attributeVisuals[attribute];
  const Icon = visual.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center justify-between rounded-lg border px-3 py-2",
            visual.accentClassName,
            className,
          )}
        >
          <Icon className={cn("size-4", visual.iconClassName)} />
          <span className="text-sm font-semibold tabular-nums">{value}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={6}>
        {tooltipLabel ?? `${visual.label}: ${value}`}
      </TooltipContent>
    </Tooltip>
  );
}
