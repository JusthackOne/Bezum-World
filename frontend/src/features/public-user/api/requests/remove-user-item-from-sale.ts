import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { ItemListingResponse } from "../../model/public-user.types";
import { publicUserApi } from "../endpoints";

export async function removeUserItemFromSale(itemId: string): Promise<ItemListingResponse> {
  return requestApiData(
    () =>
      clientHttpClient.delete<ApiSuccessResponse<ItemListingResponse>>(
        publicUserApi.listing(itemId),
      ),
    "Failed to remove item from sale",
  );
}
