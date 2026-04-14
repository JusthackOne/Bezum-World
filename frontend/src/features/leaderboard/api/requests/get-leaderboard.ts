import { clientHttpClient } from "@/shared/lib/client-http-client";
import { requestApiData } from "@/shared/lib/api-request";
import type { ApiSuccessResponse } from "@/shared/types/backend-api-response";

import { leaderboardEndpoints } from "../endpoints";
import type { LeaderboardPeriod, LeaderboardResponse } from "../../model/leaderboard.types";

export async function getLeaderboard(period: LeaderboardPeriod): Promise<LeaderboardResponse> {
  return requestApiData(
    () =>
      clientHttpClient.get<ApiSuccessResponse<LeaderboardResponse>>(leaderboardEndpoints.list, {
        params: {
          period,
        },
      }),
    "Failed to load leaderboard",
  );
}

