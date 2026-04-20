import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminDeleteUserResponse } from "../../model/admin-user.types";

export async function deleteAdminUser(userId: string): Promise<AdminDeleteUserResponse> {
  return requestApiData(
    () =>
      adminHttpClient.delete<ApiSuccessResponse<AdminDeleteUserResponse>>(`/admin/users/${userId}`),
    "Failed to delete user",
  );
}
