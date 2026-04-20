import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import type {
  ClientAuthTokensResponse,
  ClientLoginByCodePayload,
} from "../model/client-auth.types";

export async function loginClientByCode(
  payload: ClientLoginByCodePayload,
): Promise<ClientAuthTokensResponse> {
  return requestApiData(
    () =>
      clientHttpClient.post<ApiSuccessResponse<ClientAuthTokensResponse>>(
        "/auth/login/code",
        payload,
      ),
    "Client login failed",
  );
}
