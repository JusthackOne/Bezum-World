import { isAxiosError } from "axios";

import { httpClient } from "@/shared/lib/http-client";
import { isRecord } from "@/shared/lib/type-guards";
import type { ApiErrorResponse, ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminUser } from "../model/admin-user.types";

const isApiSuccessResponse = (value: unknown): value is ApiSuccessResponse<AdminUser[]> => {
  return isRecord(value) && value.success === true && "data" in value;
};

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse => {
  return isRecord(value) && value.success === false && "error" in value;
};

function getErrorMessage(payload: unknown, fallbackMessage: string): string {
  if (!isApiErrorResponse(payload)) {
    return fallbackMessage;
  }

  return payload.error.message;
}

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
