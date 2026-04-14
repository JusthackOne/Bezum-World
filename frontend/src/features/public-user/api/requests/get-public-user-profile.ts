import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { PublicUserProfile } from "../../model/public-user.types";

export async function getPublicUserProfile(username: string): Promise<PublicUserProfile> {
  return requestApiData(
    () => clientHttpClient.get<ApiSuccessResponse<PublicUserProfile>>(`/users/${encodeURIComponent(username)}`),
    "Failed to load user profile",
  );
}
