"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CivilizationGameState, CivilizationGameStatus } from "@/entities/civilization";
import { queryKeys } from "@/shared/config/query-keys";
import {
  clearSuccessfulIdempotencyAttempt,
  getOrCreateIdempotencyKey,
  type IdempotencyAttempt,
  stableRequestFingerprint,
} from "@/shared/lib/idempotency";

import {
  getCivilizationGameState,
  getCivilizationHistory,
  getCurrentCivilizationGame,
  performCivilizationAction,
  type CivilizationActionPayload,
} from "./requests";

const ACTIVE_GAME_POLL_INTERVAL_MS = 20_000;

function shouldPollCivilizationGame(status: CivilizationGameStatus | undefined): boolean {
  return status === "SCHEDULED" || status === "ACTIVE";
}

function actionFingerprint(gameId: string | null, payload: CivilizationActionPayload): string {
  const action = { ...payload } as Record<string, unknown>;
  delete action.actionId;
  return stableRequestFingerprint({ gameId, action });
}

export function useCurrentCivilizationGameQuery() {
  return useQuery({
    queryKey: queryKeys.civilizationCurrent,
    queryFn: getCurrentCivilizationGame,
    refetchOnWindowFocus: "always",
    refetchInterval: (query) =>
      shouldPollCivilizationGame(query.state.data?.status) ? ACTIVE_GAME_POLL_INTERVAL_MS : false,
  });
}

export function useCivilizationGameStateQuery(gameId: string | null, isHistorical = false) {
  return useQuery({
    queryKey: queryKeys.civilizationState(gameId ?? "none"),
    queryFn: () => getCivilizationGameState(gameId!),
    enabled: Boolean(gameId),
    refetchOnWindowFocus: "always",
    refetchInterval: (query) =>
      !isHistorical && shouldPollCivilizationGame(query.state.data?.game.status)
        ? ACTIVE_GAME_POLL_INTERVAL_MS
        : false,
  });
}

export function useCivilizationHistoryQuery(page: number, limit = 12) {
  return useQuery({
    queryKey: queryKeys.civilizationHistory(page, limit),
    queryFn: () => getCivilizationHistory(page, limit),
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: "always",
  });
}

export function useCivilizationActionMutation(gameId: string | null) {
  const queryClient = useQueryClient();
  const actionAttemptRef = useRef<IdempotencyAttempt | null>(null);

  return useMutation({
    mutationFn: (payload: CivilizationActionPayload) => {
      const fingerprint = actionFingerprint(gameId, payload);
      const actionId = getOrCreateIdempotencyKey(
        actionAttemptRef,
        fingerprint,
        () => payload.actionId,
      );
      return performCivilizationAction(gameId!, {
        ...payload,
        actionId,
      } as CivilizationActionPayload);
    },
    onSuccess: (result, payload) => {
      const fingerprint = actionFingerprint(gameId, payload);
      clearSuccessfulIdempotencyAttempt(actionAttemptRef, fingerprint);
      queryClient.setQueryData<CivilizationGameState>(
        queryKeys.civilizationState(gameId!),
        result.gameState,
      );
    },
    onSettled: () => {
      if (!gameId) {
        return;
      }

      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: queryKeys.civilizationCurrent }),
        queryClient.invalidateQueries({ queryKey: queryKeys.civilizationState(gameId) }),
      ]);
    },
  });
}
