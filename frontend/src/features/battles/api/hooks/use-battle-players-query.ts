"use client";

import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { getBattlePlayers } from "../requests/get-battle-players";

export function useBattlePlayersQuery() {
  return useQuery({
    queryKey: queryKeys.battlesPlayers,
    queryFn: getBattlePlayers,
  });
}
