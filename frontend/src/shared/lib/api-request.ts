import { isAxiosError, type AxiosResponse } from "axios";

import { getErrorMessage, isApiSuccessResponse } from "@/shared/lib/api-response";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

export async function requestApiData<TData>(
  makeRequest: () => Promise<AxiosResponse<ApiSuccessResponse<TData>>>,
  fallbackErrorMessage: string,
): Promise<TData> {
  try {
    const response = await makeRequest();

    if (!isApiSuccessResponse<TData>(response.data)) {
      throw new Error("Unexpected server response");
    }

    return response.data.data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      throw new Error(getErrorMessage(error.response?.data, fallbackErrorMessage));
    }

    throw error;
  }
}
