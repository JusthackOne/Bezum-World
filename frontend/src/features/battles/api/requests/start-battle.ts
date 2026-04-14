import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { battlesApi } from "../endpoints";
import type { StartBattleResponse } from "../../model/battles.types";

export async function startBattle(opponentUserId: string): Promise<StartBattleResponse> {
  return requestApiData(
    () =>
      clientHttpClient.post<ApiSuccessResponse<StartBattleResponse>>(
        battlesApi.startBattle(opponentUserId),
      ),
    "Failed to start battle",
  );
}
