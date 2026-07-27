"use client";

import { useMutation, useQuery } from "@tanstack/react-query";

import type { SlotLeaderboardType } from "@/features/slots/model";
import { queryKeys } from "@/shared/config/query-keys";

import { getSlotsConfig, getSlotsLeaderboard, spinSlots } from "./requests";

export function useSlotsConfigQuery() {
  return useQuery({
    queryKey: queryKeys.slotsConfig,
    queryFn: getSlotsConfig,
    staleTime: Number.POSITIVE_INFINITY,
  });
}

export function useSpinSlotsMutation() {
  return useMutation({
    mutationFn: spinSlots,
  });
}

export function useSlotsLeaderboardQuery(type: SlotLeaderboardType) {
  return useQuery({
    queryKey: queryKeys.slotsLeaderboard(type),
    queryFn: () => getSlotsLeaderboard(type),
  });
}
