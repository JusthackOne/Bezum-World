import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminItem, GetAdminItemsInput } from "../../model/admin-item.types";

export async function getAdminItems(input: GetAdminItemsInput = {}): Promise<AdminItem[]> {
  return requestApiData(
    () =>
      adminHttpClient.get<ApiSuccessResponse<AdminItem[]>>("/items", {
        params: input.location ? { location: input.location } : undefined,
      }),
    "Failed to load items",
  );
}
