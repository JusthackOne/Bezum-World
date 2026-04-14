"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getShopItems } from "../requests/get-shop-items";

export function useShopItemsQuery() {
  return useQuery({
    queryKey: queryKeys.shopItems,
    queryFn: getShopItems,
  });
}
