"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { purchaseShopItem } from "../requests/purchase-shop-item";

export function usePurchaseShopItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseShopItem,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventsPrefix });
    },
  });
}
