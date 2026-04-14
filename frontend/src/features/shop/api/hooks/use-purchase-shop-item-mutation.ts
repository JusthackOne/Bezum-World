"use client";

import { useMutation } from "@tanstack/react-query";

import { purchaseShopItem } from "../requests/purchase-shop-item";

export function usePurchaseShopItemMutation() {
  return useMutation({
    mutationFn: purchaseShopItem,
  });
}
