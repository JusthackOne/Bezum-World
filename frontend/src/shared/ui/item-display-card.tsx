"use client";

import { CoinsIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import {
  formatBalance,
  getItemAttributeRows,
  resolveAssetUrl,
} from "@/shared/lib/item-display";
import type { ItemDisplay } from "@/shared/model/item-display.types";
import { Button } from "@/shared/ui/8bit/button";

const itemAttributeVisuals: Record<
  "strength" | "intelligence" | "charisma" | "endurance",
  {
    iconClassName: string;
    badgeClassName: string;
  }
> = {
  strength: {
    iconClassName: "text-red-400",
    badgeClassName:
      "border-red-400/65 bg-red-500/12 shadow-[0_0_0_1px_rgba(248,113,113,0.24),0_0_14px_rgba(239,68,68,0.14)]",
  },
  intelligence: {
    iconClassName: "text-blue-400",
    badgeClassName:
      "border-blue-400/65 bg-blue-500/12 shadow-[0_0_0_1px_rgba(96,165,250,0.24),0_0_14px_rgba(59,130,246,0.14)]",
  },
  charisma: {
    iconClassName: "text-emerald-400",
    badgeClassName:
      "border-emerald-400/65 bg-emerald-500/12 shadow-[0_0_0_1px_rgba(52,211,153,0.22),0_0_14px_rgba(16,185,129,0.14)]",
  },
  endurance: {
    iconClassName: "text-violet-400",
    badgeClassName:
      "border-violet-400/65 bg-violet-500/12 shadow-[0_0_0_1px_rgba(196,181,253,0.24),0_0_14px_rgba(139,92,246,0.14)]",
  },
};

const inventoryRarityStyles: Record<string, { borderClassName: string; glowClassName: string }> = {
  unterlyanskiy: {
    borderClassName: "border-amber-900/85",
    glowClassName: "shadow-[0_0_0_1px_rgba(120,53,15,0.35),0_12px_30px_rgba(69,26,3,0.28)]",
  },
  basic_minimum: {
    borderClassName: "border-emerald-400/90",
    glowClassName: "shadow-[0_0_0_1px_rgba(16,185,129,0.34),0_12px_30px_rgba(6,95,70,0.26)]",
  },
  sigma: {
    borderClassName: "border-violet-400/90",
    glowClassName: "shadow-[0_0_0_1px_rgba(167,139,250,0.36),0_12px_30px_rgba(91,33,182,0.28)]",
  },
  bezumnyy: {
    borderClassName: "border-amber-300/95",
    glowClassName: "shadow-[0_0_0_1px_rgba(251,191,36,0.4),0_12px_32px_rgba(180,83,9,0.3)]",
  },
};

interface ItemDisplayCardProps<TItem extends ItemDisplay> {
  item: TItem;
  onOpenDetails?: (item: TItem) => void;
  actionLabel?: string;
  onAction?: (item: TItem) => void;
  actionDisabled?: boolean;
  actionAriaLabel?: string;
  actionLoadingLabel?: string;
  isActionLoading?: boolean;
}

export function ItemDisplayCard<TItem extends ItemDisplay>({
  item,
  onOpenDetails,
  actionLabel,
  onAction,
  actionDisabled = false,
  actionAriaLabel,
  actionLoadingLabel,
  isActionLoading = false,
}: ItemDisplayCardProps<TItem>) {
  const rarityStyle = inventoryRarityStyles[item.rarity] ?? {
    borderClassName: "border-border",
    glowClassName: "shadow-sm",
  };
  const itemAttributes = getItemAttributeRows(item);
  const imageUrl = item.image_url ? resolveAssetUrl(item.image_url) : null;
  const hasAction = Boolean(actionLabel) && Boolean(onAction);

  return (
    <article
      className={cn(
        "group isolate relative flex min-h-84 cursor-pointer overflow-hidden rounded-2xl border transition-shadow",
        rarityStyle.borderClassName,
        rarityStyle.glowClassName,
      )}
      role={onOpenDetails ? "button" : undefined}
      tabIndex={onOpenDetails ? 0 : undefined}
      onClick={() => onOpenDetails?.(item)}
      onKeyDown={(event) => {
        if (!onOpenDetails) {
          return;
        }

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetails(item);
        }
      }}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={item.name}
            className="h-full w-full rounded-[inherit] object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-muted/45 text-sm text-muted-foreground">
            No image
          </div>
        )}
      </div>

      <div className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_center,rgba(2,6,23,0.1)_0%,rgba(2,6,23,0.46)_72%,rgba(2,6,23,0.74)_100%)]" />
      <div className="absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(2,6,23,0.16)_0%,rgba(2,6,23,0.04)_38%,rgba(2,6,23,0.74)_100%)]" />

      <div className="absolute top-3 left-1/2 z-20 -translate-x-1/2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/70 bg-[linear-gradient(120deg,rgba(250,204,21,0.2),rgba(251,191,36,0.12))] px-2.5 py-0.5 shadow-[0_0_0_1px_rgba(245,158,11,0.24),0_0_16px_rgba(245,158,11,0.18)]">
          <CoinsIcon className="size-3.5 text-amber-300" />
          <span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-[10px] font-semibold tabular-nums text-transparent">
            {formatBalance(item.price)}
          </span>
        </span>
      </div>

      <div className="absolute inset-x-3 bottom-3 z-20 rounded-lg border border-white/20 bg-slate-950/56 p-3 backdrop-blur-[2px]">
        <div className="flex flex-col-reverse gap-2.5">
          {hasAction ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={actionDisabled || isActionLoading}
              className="h-7 w-full rounded-md border-none bg-white/12 px-2 text-[8px] text-white shadow-none ring-0 outline-none hover:bg-white/20 hover:text-white focus-visible:ring-0 focus-visible:outline-none"
              onClick={(event) => {
                event.stopPropagation();
                onAction(item);
              }}
              aria-label={actionAriaLabel ?? `${actionLabel} ${item.name}`}
            >
              {isActionLoading && actionLoadingLabel ? actionLoadingLabel : actionLabel}
            </Button>
          ) : null}

          {itemAttributes.length > 0 ? (
            <div className="grid grid-cols-2 gap-1.5">
              {itemAttributes.map((attribute) => {
                const Icon = attribute.icon;
                const visual = itemAttributeVisuals[attribute.key];

                return (
                  <div
                    key={attribute.key}
                    className={cn(
                      "flex items-center justify-between rounded-md border px-2 py-1",
                      visual.badgeClassName,
                    )}
                  >
                    <Icon className={cn("size-3", visual.iconClassName)} />
                    <span className="text-[8px] font-semibold tabular-nums">{attribute.value}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-[8px] text-slate-200/90">No attributes</p>
          )}

          <h2 className="text-center text-[10px] leading-tight font-semibold text-white drop-shadow-[0_1px_6px_rgba(2,6,23,0.9)]">
            {item.name}
          </h2>
        </div>
      </div>
    </article>
  );
}
