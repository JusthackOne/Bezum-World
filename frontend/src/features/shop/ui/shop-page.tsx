"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CoinsIcon } from "lucide-react";

import { usePurchaseShopItemMutation, useShopItemsQuery } from "@/features/shop/api";
import type { ShopItem } from "@/features/shop/model/shop-item.types";
import { queryKeys } from "@/shared/config/query-keys";
import {
  formatBalance,
  getItemAttributeRows,
  itemRarityStyles,
  resolveAssetUrl,
} from "@/shared/lib/item-display";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { ItemDetailsModal } from "@/shared/ui/item-details-modal";

export function ShopPage() {
  const queryClient = useQueryClient();
  const itemsQuery = useShopItemsQuery();
  const purchaseMutation = usePurchaseShopItemMutation();

  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  const handleBuy = async (itemId: string) => {
    setPurchaseError(null);
    setBuyingItemId(itemId);

    try {
      await purchaseMutation.mutateAsync(itemId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.shopItems });

      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
      }
    } catch (error: unknown) {
      setPurchaseError(error instanceof Error ? error.message : "Failed to purchase item.");
    } finally {
      setBuyingItemId(null);
    }
  };

  if (itemsQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Failed to load shop items</CardTitle>
          <CardDescription>
            {itemsQuery.error instanceof Error ? itemsQuery.error.message : "Unexpected error"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => itemsQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Shop</CardTitle>
          <CardDescription>
            {itemsQuery.isPending
              ? "Loading items..."
              : `${items.length} item${items.length === 1 ? "" : "s"} in shop`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {purchaseError ? <p className="text-sm text-destructive">{purchaseError}</p> : null}

          {itemsQuery.isPending ? (
            <p className="text-muted-foreground text-sm">Loading items...</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No items available in shop.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const rarityStyle = itemRarityStyles[item.rarity] ?? {
                  borderClassName: "border-border",
                  glowClassName: "shadow-sm",
                };
                const itemAttributes = getItemAttributeRows(item);
                const imageUrl = item.image_url ? resolveAssetUrl(item.image_url) : null;
                const isBuying = buyingItemId === item.id;

                return (
                  <article
                    key={item.id}
                    className={cn(
                      "flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-card transition-shadow",
                      rarityStyle.borderClassName,
                      rarityStyle.glowClassName,
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedItem(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedItem(item);
                      }
                    }}
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted/35">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="flex h-full flex-col gap-3 p-4">
                      <h2 className="text-base leading-tight font-semibold">{item.name}</h2>

                      {itemAttributes.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {itemAttributes.map((attribute) => {
                            const Icon = attribute.icon;

                            return (
                              <div
                                key={attribute.key}
                                className="flex items-center justify-between rounded-md border bg-muted/15 px-2 py-1.5"
                              >
                                <Icon className="size-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium tabular-nums">
                                  {attribute.value}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs">No attributes</p>
                      )}

                      <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                        <Button
                          type="button"
                          size="sm"
                          disabled={isBuying}
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleBuy(item.id);
                          }}
                        >
                          {isBuying ? "Buying..." : "Buy"}
                        </Button>

                        <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold">
                          <CoinsIcon className="size-4" />
                          {formatBalance(item.price)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ItemDetailsModal
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      />
    </>
  );
}
