import { isAxiosError } from "axios";

import { adminHttpClient } from "@/shared/lib/admin-http-client";
import {
  getErrorMessage,
  isApiSuccessResponse,
} from "@/shared/lib/api-response";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminAuthTokensResponse, AdminLoginPayload } from "../model/admin-auth.types";

export async function loginAdmin(payload: AdminLoginPayload): Promise<AdminAuthTokensResponse> {
  try {
    const response = await adminHttpClient.post<ApiSuccessResponse<AdminAuthTokensResponse>>(
      "/auth/admin/login",
      payload,
    );

    if (!isApiSuccessResponse(response.data)) {
      throw new Error("Unexpected server response");
    }

    return response.data.data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      throw new Error(getErrorMessage(error.response?.data, "Admin login failed"));
    }

    throw error;
  }
}
