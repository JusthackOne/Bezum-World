import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { ShopItem } from "../../model/shop-item.types";
import { shopApi } from "../endpoints";

export async function getShopItems(playerListingsOnly: boolean): Promise<ShopItem[]> {
  const items = await requestApiData(
    () =>
      clientHttpClient.get<ApiSuccessResponse<ShopItem[]>>(shopApi.items, {
        params: {
          saleSource: playerListingsOnly ? "players" : "all",
        },
      }),
    "Failed to load shop items",
  );

  return items.map((item) =>
    item.isListedForSale && item.listingPrice !== null
      ? { ...item, originalPrice: item.price, price: item.listingPrice }
      : item,
  );
}
