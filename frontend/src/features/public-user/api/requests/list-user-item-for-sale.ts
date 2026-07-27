import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { ItemListingResponse } from "../../model/public-user.types";
import { publicUserApi } from "../endpoints";

export interface ListUserItemForSaleInput {
  itemId: string;
  price: number;
}

export async function listUserItemForSale(
  input: ListUserItemForSaleInput,
): Promise<ItemListingResponse> {
  return requestApiData(
    () =>
      clientHttpClient.patch<ApiSuccessResponse<ItemListingResponse>>(
        publicUserApi.listing(input.itemId),
        { price: input.price },
      ),
    "Failed to list item for sale",
  );
}
