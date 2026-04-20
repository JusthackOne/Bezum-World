import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminAuthTokensResponse, AdminLoginPayload } from "../model/admin-auth.types";

export async function loginAdmin(payload: AdminLoginPayload): Promise<AdminAuthTokensResponse> {
  return requestApiData(
    () =>
      adminHttpClient.post<ApiSuccessResponse<AdminAuthTokensResponse>>(
        "/auth/admin/login",
        payload,
      ),
    "Admin login failed",
  );
}
