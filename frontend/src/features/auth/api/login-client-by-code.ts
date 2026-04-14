import { isAxiosError } from "axios";

import { clientHttpClient } from "@/shared/lib/client-http-client";
import { getErrorMessage, isApiSuccessResponse } from "@/shared/lib/api-response";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type {
  ClientAuthTokensResponse,
  ClientLoginByCodePayload,
} from "../model/client-auth.types";

export async function loginClientByCode(
  payload: ClientLoginByCodePayload,
): Promise<ClientAuthTokensResponse> {
  try {
    const response = await clientHttpClient.post<ApiSuccessResponse<ClientAuthTokensResponse>>(
      "/auth/login/code",
      payload,
    );

    if (!isApiSuccessResponse(response.data)) {
      throw new Error("Unexpected server response");
    }

    return response.data.data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      throw new Error(getErrorMessage(error.response?.data, "Client login failed"));
    }

    throw error;
  }
}
