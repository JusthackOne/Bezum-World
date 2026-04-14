"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getLeaderboard } from "../requests/get-leaderboard";
import type { LeaderboardPeriod } from "../../model/leaderboard.types";

export function useLeaderboardQuery(period: LeaderboardPeriod) {
  return useQuery({
    queryKey: queryKeys.leaderboard(period),
    queryFn: () => getLeaderboard(period),
  });
}

