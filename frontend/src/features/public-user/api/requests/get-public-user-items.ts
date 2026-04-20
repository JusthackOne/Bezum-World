import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { PublicUserItemsResponse } from "../../model/public-user.types";
import { publicUserApi } from "../endpoints";

export async function getPublicUserItems(username: string): Promise<PublicUserItemsResponse> {
  return requestApiData(
    () =>
      clientHttpClient.get<ApiSuccessResponse<PublicUserItemsResponse>>(
        publicUserApi.items(username),
      ),
    "Failed to load user items",
  );
}
