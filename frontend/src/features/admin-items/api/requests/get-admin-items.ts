import { isAxiosError } from "axios";

import { getErrorMessage, isApiSuccessResponse } from "@/shared/lib/api-response";
import { adminHttpClient } from "@/shared/lib/admin-http-client";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type { AdminItem, GetAdminItemsInput } from "../../model/admin-item.types";

export async function getAdminItems(input: GetAdminItemsInput = {}): Promise<AdminItem[]> {
  try {
    const response = await adminHttpClient.get<ApiSuccessResponse<AdminItem[]>>("/items", {
      params: input.location ? { location: input.location } : undefined,
    });

    if (!isApiSuccessResponse(response.data)) {
      throw new Error("Unexpected server response");
    }

    return response.data.data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      throw new Error(getErrorMessage(error.response?.data, "Failed to load items"));
    }

    throw error;
  }
}
