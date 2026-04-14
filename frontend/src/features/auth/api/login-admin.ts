import { isAxiosError } from "axios";

import { httpClient } from "@/shared/lib/http-client";
import {
  getErrorMessage,
  isApiSuccessResponse,
} from "@/shared/lib/api-response";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminAuthTokensResponse, AdminLoginPayload } from "../model/admin-auth.types";

export async function loginAdmin(payload: AdminLoginPayload): Promise<AdminAuthTokensResponse> {
  try {
    const response = await httpClient.post<ApiSuccessResponse<AdminAuthTokensResponse>>(
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
