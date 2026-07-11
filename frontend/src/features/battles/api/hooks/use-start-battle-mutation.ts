"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/shared/config/query-keys";

import { startBattle } from "../requests/start-battle";

export function useStartBattleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startBattle,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.eventsPrefix });
    },
  });
}
