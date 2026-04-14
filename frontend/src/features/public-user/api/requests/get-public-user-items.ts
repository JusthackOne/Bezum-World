import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { PublicUserItemsResponse } from "../../model/public-user.types";

export async function getPublicUserItems(username: string): Promise<PublicUserItemsResponse> {
  return requestApiData(
    () =>
      clientHttpClient.get<ApiSuccessResponse<PublicUserItemsResponse>>(
        `/users/${encodeURIComponent(username)}/items`,
      ),
    "Failed to load user items",
  );
}
