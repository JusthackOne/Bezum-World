import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminDeleteItemResponse } from "../../model/admin-item.types";

export async function deleteAdminItem(itemId: string): Promise<AdminDeleteItemResponse> {
  return requestApiData(
    () =>
      adminHttpClient.delete<ApiSuccessResponse<AdminDeleteItemResponse>>(
        `/admin/items/${encodeURIComponent(itemId)}`,
      ),
    "Failed to delete item",
  );
}
