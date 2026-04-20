"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { SparklesIcon } from "lucide-react";

import { usePurchaseShopItemMutation, useShopItemsQuery } from "@/features/shop/api";
import type { ShopItem } from "@/features/shop/model/shop-item.types";
import { queryKeys } from "@/shared/config/query-keys";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { Checkbox } from "@/shared/ui/checkbox";
import { ItemDetailsModal } from "@/shared/ui";
import { ItemDisplayCard } from "@/shared/ui";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/shared/ui/8bit/toast";

type RarityFilterValue = "unterlyanskiy" | "basic_minimum" | "sigma" | "bezumnyy";
type RarityFilterOptionValue = RarityFilterValue | "all";
type SortOptionValue = "price_desc" | "price_asc" | "quality_desc" | "quality_asc";

interface RarityFilterOption {
  value: RarityFilterOptionValue;
  label: string;
  textClassName: string;
}

type ToastVariant = "default" | "destructive";

interface ToastState {
  key: number;
  open: boolean;
  title: string;
  description: string;
  variant: ToastVariant;
}

const rarityFilterOptions: ReadonlyArray<RarityFilterOption> = [
  { value: "all", label: "All", textClassName: "text-foreground" },
  {
    value: "unterlyanskiy",
    label: "Unterlyanskiy",
    textClassName: "text-amber-700 dark:text-amber-300",
  },
  {
    value: "basic_minimum",
    label: "Basic minimum",
    textClassName: "text-emerald-600 dark:text-emerald-300",
  },
  { value: "sigma", label: "Sigma", textClassName: "text-violet-600 dark:text-violet-300" },
  { value: "bezumnyy", label: "Bezumnyy", textClassName: "text-amber-500 dark:text-amber-300" },
];

const sortOptions: ReadonlyArray<{ value: SortOptionValue; label: string }> = [
  { value: "price_desc", label: "Price: High to Low" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "quality_desc", label: "Quality: Best to Worst" },
  { value: "quality_asc", label: "Quality: Worst to Best" },
];

const rarityQualityRank: Record<RarityFilterValue, number> = {
  bezumnyy: 4,
  sigma: 3,
  basic_minimum: 2,
  unterlyanskiy: 1,
};

export function ShopPage() {
  const queryClient = useQueryClient();
  const itemsQuery = useShopItemsQuery();
  const purchaseMutation = usePurchaseShopItemMutation();

  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [buyingItemId, setBuyingItemId] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [selectedRarities, setSelectedRarities] = useState<RarityFilterOptionValue[]>(["all"]);
  const [selectedSort, setSelectedSort] = useState<SortOptionValue>("quality_desc");
  const [isRarityDropdownOpen, setIsRarityDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [toastState, setToastState] = useState<ToastState>({
    key: 0,
    open: false,
    title: "",
    description: "",
    variant: "default",
  });

  const rarityDropdownRef = useRef<HTMLDivElement | null>(null);
  const sortDropdownRef = useRef<HTMLDivElement | null>(null);

  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  const selectedRarityValues = useMemo<RarityFilterValue[]>(() => {
    if (selectedRarities.includes("all")) {
      return [];
    }

    return selectedRarities.filter((value): value is RarityFilterValue => value !== "all");
  }, [selectedRarities]);

  const filteredAndSortedItems = useMemo(() => {
    const filteredItems =
      selectedRarityValues.length > 0
        ? items.filter((item) => selectedRarityValues.includes(item.rarity as RarityFilterValue))
        : items;

    const sortedItems = [...filteredItems];

    switch (selectedSort) {
      case "price_desc":
        sortedItems.sort((left, right) => right.price - left.price);
        break;
      case "price_asc":
        sortedItems.sort((left, right) => left.price - right.price);
        break;
      case "quality_desc":
        sortedItems.sort((left, right) => {
          const rightScore = rarityQualityRank[right.rarity as RarityFilterValue] ?? 0;
          const leftScore = rarityQualityRank[left.rarity as RarityFilterValue] ?? 0;

          if (rightScore !== leftScore) {
            return rightScore - leftScore;
          }

          return right.price - left.price;
        });
        break;
      case "quality_asc":
        sortedItems.sort((left, right) => {
          const rightScore = rarityQualityRank[right.rarity as RarityFilterValue] ?? 0;
          const leftScore = rarityQualityRank[left.rarity as RarityFilterValue] ?? 0;

          if (rightScore !== leftScore) {
            return leftScore - rightScore;
          }

          return left.price - right.price;
        });
        break;
      default:
        break;
    }

    return sortedItems;
  }, [items, selectedRarityValues, selectedSort]);

  const raritySummary = useMemo(() => {
    if (selectedRarityValues.length === 0) {
      return "All";
    }

    return rarityFilterOptions
      .filter((option) => option.value !== "all" && selectedRarityValues.includes(option.value))
      .map((option) => option.label)
      .join(", ");
  }, [selectedRarityValues]);

  const selectedSortOption = useMemo(
    () => sortOptions.find((option) => option.value === selectedSort) ?? sortOptions[0],
    [selectedSort],
  );

  function showToast(title: string, description: string, variant: ToastVariant = "default") {
    setToastState((previousState) => ({
      key: previousState.key + 1,
      open: true,
      title,
      description,
      variant,
    }));
  }

  const handleRarityToggle = (value: RarityFilterOptionValue) => {
    if (value === "all") {
      setSelectedRarities(["all"]);
      return;
    }

    setSelectedRarities((previousValues) => {
      const nextValues = previousValues.filter((previousValue) => previousValue !== "all");

      if (nextValues.includes(value)) {
        const updatedValues = nextValues.filter((previousValue) => previousValue !== value);
        return updatedValues.length > 0 ? updatedValues : ["all"];
      }

      return [...nextValues, value];
    });
  };

  const handleBuy = async (itemId: string) => {
    setPurchaseError(null);
    setBuyingItemId(itemId);

    try {
      await purchaseMutation.mutateAsync(itemId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.shopItems });
      showToast("Purchase successful", "Item was added to your inventory.");

      if (selectedItem?.id === itemId) {
        setSelectedItem(null);
      }
    } catch (error: unknown) {
      setPurchaseError(error instanceof Error ? error.message : "Failed to purchase item.");
    } finally {
      setBuyingItemId(null);
    }
  };

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const targetNode = event.target as Node | null;

      if (
        targetNode &&
        !rarityDropdownRef.current?.contains(targetNode) &&
        !sortDropdownRef.current?.contains(targetNode)
      ) {
        setIsRarityDropdownOpen(false);
        setIsSortDropdownOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

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
    <ToastProvider duration={3500} swipeDirection="right">
      <Card>
        <CardHeader>
          <CardTitle>Shop</CardTitle>
          <CardDescription>
            {itemsQuery.isPending
              ? "Loading items..."
              : `${filteredAndSortedItems.length} item${filteredAndSortedItems.length === 1 ? "" : "s"} shown`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {purchaseError ? <p className="text-sm text-destructive">{purchaseError}</p> : null}

          <div className="flex flex-wrap items-start justify-between gap-2">
            <div ref={rarityDropdownRef} className="relative w-full sm:w-[230px]">
              <Button
                type="button"
                variant="outline"
                className="h-8 w-full justify-between px-2 text-xs"
                onClick={() => {
                  setIsRarityDropdownOpen((previous) => !previous);
                  setIsSortDropdownOpen(false);
                }}
              >
                <span>Rarity</span>
                <span className="max-w-[130px] truncate text-[10px] text-muted-foreground">
                  {raritySummary}
                </span>
              </Button>

              {isRarityDropdownOpen ? (
                <div className="bg-card absolute z-30 mt-1.5 w-full rounded-md border p-2 shadow-lg">
                  <div className="space-y-1">
                    {rarityFilterOptions.map((option) => {
                      const isChecked =
                        option.value === "all"
                          ? selectedRarityValues.length === 0
                          : selectedRarityValues.includes(option.value);

                      return (
                        <label
                          key={option.value}
                          className={cn(
                            "flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 transition-colors",
                            isChecked ? "bg-muted/40" : "hover:bg-muted/30",
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleRarityToggle(option.value)}
                            aria-label={option.label}
                            className="size-3.5 rounded-[3px] [&_svg]:size-2.5"
                          />
                          <span className={cn("text-xs font-medium", option.textClassName)}>
                            {option.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div ref={sortDropdownRef} className="relative w-full sm:w-[230px]">
              <Button
                type="button"
                variant="outline"
                className="h-8 w-full justify-between px-2 text-xs"
                onClick={() => {
                  setIsSortDropdownOpen((previous) => !previous);
                  setIsRarityDropdownOpen(false);
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <SparklesIcon className="size-4" />
                  Sort
                </span>
                <span className="max-w-[130px] truncate text-[10px] text-muted-foreground">
                  {selectedSortOption.label}
                </span>
              </Button>

              {isSortDropdownOpen ? (
                <div className="bg-card absolute z-30 mt-1.5 w-full rounded-md border p-2 shadow-lg">
                  <div className="space-y-1">
                    {sortOptions.map((option) => {
                      const isSelected = selectedSort === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          className={cn(
                            "flex w-full items-center rounded-md border px-2 py-1 text-left text-xs transition-colors",
                            isSelected ? "bg-muted/45" : "hover:bg-muted/30",
                          )}
                          onClick={() => {
                            setSelectedSort(option.value);
                            setIsSortDropdownOpen(false);
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {itemsQuery.isPending ? (
            <p className="text-muted-foreground text-sm">Loading items...</p>
          ) : filteredAndSortedItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">No items match the selected filters.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {filteredAndSortedItems.map((item) => {
                const isBuying = buyingItemId === item.id;

                return (
                  <ItemDisplayCard
                    isShopCard={true}
                    key={item.id}
                    item={item}
                    onOpenDetails={setSelectedItem}
                    actionLabel="Buy"
                    actionLoadingLabel="Buying..."
                    isActionLoading={isBuying}
                    actionDisabled={isBuying}
                    onAction={(clickedItem) => {
                      void handleBuy(clickedItem.id);
                    }}
                    actionAriaLabel={`Buy ${item.name}`}
                  />
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
      <Toast
        key={toastState.key}
        open={toastState.open}
        onOpenChange={(open) => setToastState((previousState) => ({ ...previousState, open }))}
        variant={toastState.variant}
      >
        <div className="grid gap-1">
          <ToastTitle>{toastState.title}</ToastTitle>
          <ToastDescription>{toastState.description}</ToastDescription>
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
