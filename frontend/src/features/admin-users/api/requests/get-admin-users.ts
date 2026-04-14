import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminUser } from "../../model/admin-user.types";

export async function getAdminUsers(): Promise<AdminUser[]> {
  return requestApiData(
    () => adminHttpClient.get<ApiSuccessResponse<AdminUser[]>>("/admin/users"),
    "Failed to load users",
  );
}
