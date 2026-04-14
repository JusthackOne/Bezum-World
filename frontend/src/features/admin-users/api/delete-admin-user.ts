import { isAxiosError } from "axios";

import {
  getErrorMessage,
  isApiSuccessResponse,
} from "@/shared/lib/api-response";
import { httpClient } from "@/shared/lib/http-client";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminDeleteUserResponse } from "../model/admin-user.types";

export async function deleteAdminUser(
  accessToken: string,
  userId: string,
): Promise<AdminDeleteUserResponse> {
  try {
    const response = await httpClient.delete<ApiSuccessResponse<AdminDeleteUserResponse>>(
      `/admin/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!isApiSuccessResponse(response.data)) {
      throw new Error("Unexpected server response");
    }

    return response.data.data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      throw new Error(getErrorMessage(error.response?.data, "Failed to delete user"));
    }

    throw error;
  }
}
