import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { PurchaseShopItemResponse } from "../../model/shop-item.types";
import { shopApi } from "../endpoints";

export async function purchaseShopItem(itemId: string): Promise<PurchaseShopItemResponse> {
  return requestApiData(
    () =>
      clientHttpClient.post<ApiSuccessResponse<PurchaseShopItemResponse>>(shopApi.purchase(itemId)),
    "Failed to purchase item",
  );
}
