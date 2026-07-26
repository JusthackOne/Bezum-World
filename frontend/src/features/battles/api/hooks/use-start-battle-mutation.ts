"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { refreshCurrentUserProfile } from "@/features/auth/api";
import { queryKeys } from "@/shared/config/query-keys";

import { startBattle } from "../requests/start-battle";

export function useStartBattleMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: startBattle,
    onSuccess: async () => {
      await Promise.all([
        refreshCurrentUserProfile(queryClient),
        queryClient.invalidateQueries({ queryKey: queryKeys.eventsPrefix }),
      ]);
    },
  });
}
