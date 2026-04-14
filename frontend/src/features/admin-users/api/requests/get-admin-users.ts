import { isAxiosError } from "axios";

import {
  getErrorMessage,
  isApiSuccessResponse,
} from "@/shared/lib/api-response";
import { httpClient } from "@/shared/lib/http-client";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminUser } from "../model/admin-user.types";

export async function getAdminUsers(accessToken: string): Promise<AdminUser[]> {
  try {
    const response = await httpClient.get<ApiSuccessResponse<AdminUser[]>>("/admin/users", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!isApiSuccessResponse(response.data)) {
      throw new Error("Unexpected server response");
    }

    return response.data.data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      throw new Error(getErrorMessage(error.response?.data, "Failed to load users"));
    }

    throw error;
  }
}
