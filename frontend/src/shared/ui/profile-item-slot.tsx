"use client";

import { type ComponentType, useState } from "react";

import { getItemAttributeRows, resolveAssetUrl } from "@/shared/lib/item-display";
import { type ItemDisplay } from "@/shared/model/item-display.types";
import { cn } from "@/shared/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/8bit/tooltip";

const equipmentRarityStyles: Record<
  string,
  {
    slotBorderClassName: string;
    slotGlowClassName: string;
    tooltipBorderClassName: string;
  }
> = {
  unterlyanskiy: {
    slotBorderClassName: "border-amber-900/95",
    slotGlowClassName: "shadow-[0_0_0_1px_rgba(120,53,15,0.42),0_0_18px_rgba(69,26,3,0.28)]",
    tooltipBorderClassName: "border-amber-900/95 shadow-[0_0_0_1px_rgba(120,53,15,0.38),0_10px_24px_rgba(69,26,3,0.25)]",
  },
  basic_minimum: {
    slotBorderClassName: "border-emerald-400/95",
    slotGlowClassName: "shadow-[0_0_0_1px_rgba(16,185,129,0.38),0_0_18px_rgba(6,95,70,0.26)]",
    tooltipBorderClassName:
      "border-emerald-400/95 shadow-[0_0_0_1px_rgba(16,185,129,0.34),0_10px_24px_rgba(6,95,70,0.24)]",
  },
  sigma: {
    slotBorderClassName: "border-violet-400/95",
    slotGlowClassName: "shadow-[0_0_0_1px_rgba(167,139,250,0.4),0_0_20px_rgba(91,33,182,0.28)]",
    tooltipBorderClassName:
      "border-violet-400/95 shadow-[0_0_0_1px_rgba(167,139,250,0.36),0_10px_24px_rgba(91,33,182,0.24)]",
  },
  bezumnyy: {
    slotBorderClassName: "border-amber-300/95",
    slotGlowClassName: "shadow-[0_0_0_1px_rgba(251,191,36,0.42),0_0_20px_rgba(180,83,9,0.3)]",
    tooltipBorderClassName:
      "border-amber-300/95 shadow-[0_0_0_1px_rgba(251,191,36,0.38),0_10px_24px_rgba(180,83,9,0.25)]",
  },
};

const itemAttributeVisuals: Record<
  "strength" | "intelligence" | "charisma" | "endurance",
  {
    iconClassName: string;
    badgeClassName: string;
    valueClassName: string;
  }
> = {
  strength: {
    iconClassName: "text-red-400",
    badgeClassName:
      "border-red-400/65 bg-red-500/12 shadow-[0_0_0_1px_rgba(248,113,113,0.24),0_0_14px_rgba(239,68,68,0.14)]",
    valueClassName: "text-red-100",
  },
  intelligence: {
    iconClassName: "text-blue-400",
    badgeClassName:
      "border-blue-400/65 bg-blue-500/12 shadow-[0_0_0_1px_rgba(96,165,250,0.24),0_0_14px_rgba(59,130,246,0.14)]",
    valueClassName: "text-blue-100",
  },
  charisma: {
    iconClassName: "text-emerald-400",
    badgeClassName:
      "border-emerald-400/65 bg-emerald-500/12 shadow-[0_0_0_1px_rgba(52,211,153,0.22),0_0_14px_rgba(16,185,129,0.14)]",
    valueClassName: "text-emerald-100",
  },
  endurance: {
    iconClassName: "text-violet-400",
    badgeClassName:
      "border-violet-400/65 bg-violet-500/12 shadow-[0_0_0_1px_rgba(196,181,253,0.24),0_0_14px_rgba(139,92,246,0.14)]",
    valueClassName: "text-violet-100",
  },
};

const itemRarityTextStyles: Record<string, string> = {
  unterlyanskiy: "text-amber-700 dark:text-amber-300",
  basic_minimum: "text-emerald-600 dark:text-emerald-300",
  sigma: "text-violet-600 dark:text-violet-300",
  bezumnyy: "text-amber-500 dark:text-amber-300",
};

export function ItemTooltip({ item }: { item: ItemDisplay }) {
  const itemAttributes = getItemAttributeRows(item);
  const rarityTextClassName = itemRarityTextStyles[item.rarity] ?? "text-foreground";

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{item.name}</p>
      <p className="text-muted-foreground text-xs">{item.description ?? "No description available."}</p>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-[10px]">Rarity</span>
        <span className={cn("text-[11px] font-semibold capitalize", rarityTextClassName)}>
          {item.rarity.replaceAll("_", " ")}
        </span>
      </div>

      {itemAttributes.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {itemAttributes.map((attribute) => {
            const Icon = attribute.icon;
            const visual = itemAttributeVisuals[attribute.key];

            return (
              <div
                key={attribute.key}
                className={cn(
                  "flex items-center justify-between rounded border px-1.5 py-1",
                  visual.badgeClassName,
                )}
              >
                <Icon className={cn("size-3", visual.iconClassName)} />
                <span className={cn("text-[10px] font-semibold tabular-nums", visual.valueClassName)}>
                  +{attribute.value}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">No attributes</p>
      )}
    </div>
  );
}

interface ProfileItemSlotProps {
  label: string;
  item?: ItemDisplay;
  icon: ComponentType<{ className?: string }>;
  className?: string;
}

export function ProfileItemSlot({ label, item, icon: Icon, className }: ProfileItemSlotProps) {
  const imageUrl = item?.image_url ? resolveAssetUrl(item.image_url) : null;
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const hasImage = Boolean(imageUrl) && failedImageUrl !== imageUrl;
  const rarityStyle = item
    ? equipmentRarityStyles[item.rarity] ?? {
        slotBorderClassName: "border-border/70",
        slotGlowClassName: "shadow-sm",
        tooltipBorderClassName: "border-border shadow-sm",
      }
    : null;

  const trigger = (
    <div
      className={cn(
        "bg-muted/20 relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 transition-colors",
        rarityStyle?.slotBorderClassName ?? "border-border/70",
        rarityStyle?.slotGlowClassName,
        className,
      )}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl ?? ""}
          alt={item?.name ?? label}
          className="h-full w-full object-cover"
          onError={() => setFailedImageUrl(imageUrl)}
        />
      ) : (
        <>
          <Icon className="text-muted-foreground/45 size-9" />
          <span className="bg-background/90 absolute right-1 bottom-1 rounded px-1 py-0.5 text-[10px] leading-none">
            {label}
          </span>
        </>
      )}
    </div>
  );

  if (!item) {
    return trigger;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent
        className={cn(
          "border-2 bg-card text-foreground w-64 p-3",
          rarityStyle.tooltipBorderClassName,
        )}
        sideOffset={8}
      >
        <ItemTooltip item={item} />
      </TooltipContent>
    </Tooltip>
  );
}
