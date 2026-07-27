"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { refreshCurrentUserProfile } from "@/features/auth/api";
import { queryKeys } from "@/shared/config/query-keys";

import { getSlotsConfig, spinSlots } from "./requests";

export function useSlotsConfigQuery() {
  return useQuery({
    queryKey: queryKeys.slotsConfig,
    queryFn: getSlotsConfig,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSpinSlotsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: spinSlots,
    onSuccess: async () => {
      await refreshCurrentUserProfile(queryClient);
    },
  });
}
