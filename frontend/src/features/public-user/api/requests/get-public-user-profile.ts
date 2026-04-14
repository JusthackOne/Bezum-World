import { isAxiosError } from "axios";

import { getErrorMessage, isApiSuccessResponse } from "@/shared/lib/api-response";
import { clientHttpClient } from "@/shared/lib/client-http-client";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { PublicUserProfile } from "../../model/public-user.types";

export async function getPublicUserProfile(username: string): Promise<PublicUserProfile> {
  try {
    const response = await clientHttpClient.get<ApiSuccessResponse<PublicUserProfile>>(
      `/users/${encodeURIComponent(username)}`,
    );

    if (!isApiSuccessResponse(response.data)) {
      throw new Error("Unexpected server response");
    }

    return response.data.data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      throw new Error(getErrorMessage(error.response?.data, "Failed to load user profile"));
    }

    throw error;
  }
}
