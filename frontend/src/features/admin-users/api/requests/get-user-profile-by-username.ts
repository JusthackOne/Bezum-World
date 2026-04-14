import { adminHttpClient } from "@/shared/lib/admin-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { UserProfileByUsername } from "../../model/admin-user.types";

export async function getUserProfileByUsername(username: string): Promise<UserProfileByUsername> {
  return requestApiData(
    () => adminHttpClient.get<ApiSuccessResponse<UserProfileByUsername>>(`/users/${encodeURIComponent(username)}`),
    "Failed to load user profile",
  );
}
