import {
  BrainIcon,
  DumbbellIcon,
  ShieldIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

import { env } from "@/shared/config/env";
import type { ItemDisplay } from "@/shared/model/item-display.types";

interface ItemAttributeRow {
  key: "strength" | "charisma" | "endurance" | "intelligence";
  icon: LucideIcon;
  value: number;
}

const attributeVisuals: ReadonlyArray<{
  key: ItemAttributeRow["key"];
  icon: LucideIcon;
}> = [
  { key: "strength", icon: DumbbellIcon },
  { key: "charisma", icon: SparklesIcon },
  { key: "endurance", icon: ShieldIcon },
  { key: "intelligence", icon: BrainIcon },
];

export const itemRarityStyles: Record<string, { borderClassName: string; glowClassName: string }> = {
  unterlyanskiy: {
    borderClassName: "border-slate-300",
    glowClassName: "shadow-[0_0_0_1px_rgba(148,163,184,0.25),0_8px_24px_rgba(15,23,42,0.08)]",
  },
  basic_minimum: {
    borderClassName: "border-emerald-300",
    glowClassName: "shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_10px_28px_rgba(16,185,129,0.16)]",
  },
  sigma: {
    borderClassName: "border-sky-300",
    glowClassName: "shadow-[0_0_0_1px_rgba(14,165,233,0.3),0_10px_28px_rgba(14,165,233,0.2)]",
  },
  bezumnyy: {
    borderClassName: "border-amber-300",
    glowClassName: "shadow-[0_0_0_1px_rgba(245,158,11,0.32),0_10px_30px_rgba(245,158,11,0.26)]",
  },
};

function getItemEnduranceValue(item: Pick<ItemDisplay, "endurance" | "agility">): number | null {
  if (typeof item.endurance === "number") {
    return item.endurance;
  }

  if (typeof item.agility === "number") {
    return item.agility;
  }

  return null;
}

export function getItemAttributeRows(item: ItemDisplay): ItemAttributeRow[] {
  const mappedValues: Record<ItemAttributeRow["key"], number | null> = {
    strength: item.strength,
    charisma: item.charisma,
    endurance: getItemEnduranceValue(item),
    intelligence: item.intelligence,
  };

  return attributeVisuals
    .map(({ key, icon: Icon }) => ({
      key,
      icon: Icon,
      value: mappedValues[key],
    }))
    .filter((attribute): attribute is ItemAttributeRow => typeof attribute.value === "number");
}

export function resolveAssetUrl(value: string): string {
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("blob:")) {
    return value;
  }

  return `${env.NEXT_PUBLIC_API_BASE_URL}${value}`;
}

export function formatBalance(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}
