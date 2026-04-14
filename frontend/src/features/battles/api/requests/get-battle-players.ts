import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { battlesApi } from "../endpoints";
import type { BattlePlayersResponse } from "../../model/battles.types";

export async function getBattlePlayers(): Promise<BattlePlayersResponse> {
  return requestApiData(
    () => clientHttpClient.get<ApiSuccessResponse<BattlePlayersResponse>>(battlesApi.players),
    "Failed to load battle players",
  );
}
