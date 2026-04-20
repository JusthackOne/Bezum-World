"use client";

import { CoinsIcon, ShieldIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { formatBalance, getItemAttributeRows, resolveAssetUrl } from "@/shared/lib/item-display";
import type { ItemDisplay } from "@/shared/model/item-display.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

interface ItemDetailsModalProps {
  item: ItemDisplay | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

const modalRarityStyles: Record<
  string,
  { borderClassName: string; glowClassName: string; textClassName: string }
> = {
  unterlyanskiy: {
    borderClassName: "border-amber-900/95",
    glowClassName: "shadow-[0_0_0_1px_rgba(120,53,15,0.42),0_16px_38px_rgba(69,26,3,0.3)]",
    textClassName: "text-amber-700 dark:text-amber-300",
  },
  basic_minimum: {
    borderClassName: "border-emerald-400/95",
    glowClassName: "shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_16px_38px_rgba(6,95,70,0.28)]",
    textClassName: "text-emerald-600 dark:text-emerald-300",
  },
  sigma: {
    borderClassName: "border-violet-400/95",
    glowClassName: "shadow-[0_0_0_1px_rgba(167,139,250,0.42),0_16px_38px_rgba(91,33,182,0.3)]",
    textClassName: "text-violet-600 dark:text-violet-300",
  },
  bezumnyy: {
    borderClassName: "border-amber-300/95",
    glowClassName: "shadow-[0_0_0_1px_rgba(251,191,36,0.45),0_16px_40px_rgba(180,83,9,0.32)]",
    textClassName: "text-amber-500 dark:text-amber-300",
  },
};

const hiddenScrollbarClass =
  "[-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export function ItemDetailsModal({ item, open, onOpenChange }: ItemDetailsModalProps) {
  if (!item) {
    return null;
  }

  const rarityStyle = modalRarityStyles[item.rarity] ?? {
    borderClassName: "border-border",
    glowClassName: "shadow-sm",
    textClassName: "text-foreground",
  };
  const itemAttributes = getItemAttributeRows(item);
  const imageUrl = item.image_url ? resolveAssetUrl(item.image_url) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[85vh] overflow-x-hidden overflow-y-auto border-2 p-0",
          hiddenScrollbarClass,
          rarityStyle.borderClassName,
          rarityStyle.glowClassName,
        )}
      >
        <div className="aspect-[4/3] w-full overflow-hidden border-b bg-muted/35">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
              No image
            </div>
          )}
        </div>

        <div className="space-y-4 break-words px-4 pb-4 sm:px-6 sm:pb-6">
          <DialogHeader className="pt-4 sm:pt-6">
            <DialogTitle>{item.name}</DialogTitle>
            <DialogDescription>{item.description ?? "No description available."}</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between rounded-md border bg-muted/10 px-3 py-2">
            <span className="text-muted-foreground text-xs">Rarity</span>
            <span className={cn("text-xs font-semibold capitalize", rarityStyle.textClassName)}>
              {item.rarity.replaceAll("_", " ")}
            </span>
          </div>

          {itemAttributes.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {itemAttributes.map((attribute) => {
                const Icon = attribute.icon;
                const visual = itemAttributeVisuals[attribute.key];

                return (
                  <div
                    key={attribute.key}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-md border px-2 py-1.5",
                      visual.badgeClassName,
                    )}
                  >
                    <Icon className={cn("size-3.5", visual.iconClassName)} />
                    <span
                      className={cn("text-xs font-semibold tabular-nums", visual.valueClassName)}
                    >
                      +{attribute.value}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No attributes</p>
          )}

          <div className="space-y-2 rounded-md border bg-muted/10 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-300">
                <ShieldIcon className="size-4 text-slate-500 dark:text-slate-300" />
                Durability
              </span>
              <span className="font-semibold tabular-nums text-slate-600 drop-shadow-[0_0_8px_rgba(148,163,184,0.35)] dark:text-slate-200">
                {item.durability ?? "N/A"}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="inline-flex items-center gap-2 text-amber-300">
                <CoinsIcon className="size-4 text-amber-300" />
                Price
              </span>
              <span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-base font-semibold tabular-nums text-transparent drop-shadow-[0_0_10px_rgba(245,158,11,0.24)]">
                {formatBalance(item.price)}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
