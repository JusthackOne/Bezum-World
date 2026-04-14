import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { ShopItem } from "../../model/shop-item.types";
import { shopApi } from "../endpoints";

export async function getShopItems(): Promise<ShopItem[]> {
  return requestApiData(
    () =>
      clientHttpClient.get<ApiSuccessResponse<ShopItem[]>>(shopApi.items, {
        params: {
          location: "shop",
        },
      }),
    "Failed to load shop items",
  );
}
