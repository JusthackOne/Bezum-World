"use client";

import { CoinsIcon, ShieldIcon } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { formatBalance, getItemAttributeRows, itemRarityStyles, resolveAssetUrl } from "@/shared/lib/item-display";
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

export function ItemDetailsModal({ item, open, onOpenChange }: ItemDetailsModalProps) {
  if (!item) {
    return null;
  }

  const rarityStyle = itemRarityStyles[item.rarity] ?? {
    borderClassName: "border-border",
    glowClassName: "shadow-sm",
  };
  const itemAttributes = getItemAttributeRows(item);
  const imageUrl = item.image_url ? resolveAssetUrl(item.image_url) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[85vh] overflow-y-auto p-0",
          rarityStyle.borderClassName,
          rarityStyle.glowClassName,
        )}
      >
        <div className="aspect-[4/3] w-full overflow-hidden border-b bg-muted/35">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="text-muted-foreground flex h-full items-center justify-center text-sm">No image</div>
          )}
        </div>

        <div className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
          <DialogHeader className="pt-4 sm:pt-6">
            <DialogTitle>{item.name}</DialogTitle>
            <DialogDescription>{item.description ?? "No description available."}</DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between rounded-md border bg-muted/10 px-3 py-2 text-sm">
            <span className="text-muted-foreground">Rarity</span>
            <span className="font-semibold capitalize">{item.rarity.replaceAll("_", " ")}</span>
          </div>

          {itemAttributes.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {itemAttributes.map((attribute) => {
                const Icon = attribute.icon;

                return (
                  <div
                    key={attribute.key}
                    className="flex items-center justify-between rounded-md border bg-muted/15 px-2 py-1.5"
                  >
                    <Icon className="text-muted-foreground size-3.5" />
                    <span className="text-xs font-medium tabular-nums">{attribute.value}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">No attributes</p>
          )}

          <div className="space-y-2 rounded-md border bg-muted/10 p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground inline-flex items-center gap-2">
                <ShieldIcon className="size-4" />
                Durability
              </span>
              <span className="font-semibold tabular-nums">{item.durability ?? "N/A"}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground inline-flex items-center gap-2">
                <CoinsIcon className="size-4" />
                Price
              </span>
              <span className="font-semibold tabular-nums">{formatBalance(item.price)}</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
