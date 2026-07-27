"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getShopItems } from "../requests/get-shop-items";

export function useShopItemsQuery(playerListingsOnly: boolean) {
  return useQuery({
    queryKey: queryKeys.shopItems(playerListingsOnly),
    queryFn: () => getShopItems(playerListingsOnly),
  });
}
