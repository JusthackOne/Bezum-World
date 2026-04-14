import { isAxiosError } from "axios";

import { getErrorMessage, isApiSuccessResponse } from "@/shared/lib/api-response";
import { adminHttpClient } from "@/shared/lib/admin-http-client";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminCreateUserInput, AdminCreateUserResponse } from "../../model/admin-user.types";

export async function createAdminUser(
  payload: AdminCreateUserInput,
): Promise<AdminCreateUserResponse> {
  try {
    const formData = new FormData();
    formData.append("username", payload.username);
    formData.append("strength", String(payload.strength));
    formData.append("charisma", String(payload.charisma));
    formData.append("endurance", String(payload.endurance));
    formData.append("intelligence", String(payload.intelligence));

    if (payload.balance !== undefined) {
      formData.append("balance", String(payload.balance));
    }

    if (payload.avatarFile instanceof File) {
      formData.append("avatar", payload.avatarFile, payload.avatarFile.name);
    }

    const response = await adminHttpClient.post<ApiSuccessResponse<AdminCreateUserResponse>>(
      "/users",
      formData,
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
