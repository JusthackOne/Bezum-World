"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { refreshCurrentUserProfile } from "@/features/auth/api";
import { queryKeys } from "@/shared/config/query-keys";

import { purchaseShopItem } from "../requests/purchase-shop-item";

export function usePurchaseShopItemMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: purchaseShopItem,
    onSuccess: async () => {
      await Promise.all([
        refreshCurrentUserProfile(queryClient),
        queryClient.invalidateQueries({ queryKey: queryKeys.eventsPrefix }),
      ]);
    },
  });
}
