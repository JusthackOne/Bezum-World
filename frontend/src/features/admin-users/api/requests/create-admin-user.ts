import { isAxiosError } from "axios";

import { getErrorMessage, isApiSuccessResponse } from "@/shared/lib/api-response";
import { adminHttpClient } from "@/shared/lib/admin-http-client";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminCreateUserInput, AdminCreateUserResponse } from "../../model/admin-user.types";

export async function createAdminUser(
  payload: AdminCreateUserInput,
): Promise<AdminCreateUserResponse> {
  try {
    const response = await adminHttpClient.post<ApiSuccessResponse<AdminCreateUserResponse>>(
      "/users",
      payload,
    );

    if (!isApiSuccessResponse(response.data)) {
      throw new Error("Unexpected server response");
    }

    return response.data.data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      throw new Error(getErrorMessage(error.response?.data, "Failed to create user"));
    }

    throw error;
  }
}
