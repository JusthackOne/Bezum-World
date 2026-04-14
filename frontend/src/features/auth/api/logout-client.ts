import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

interface LogoutResponse {
  message: string;
}

export async function logoutClient(): Promise<LogoutResponse> {
  return requestApiData(
    () => clientHttpClient.post<ApiSuccessResponse<LogoutResponse>>("/auth/logout"),
    "Client logout failed",
  );
}
