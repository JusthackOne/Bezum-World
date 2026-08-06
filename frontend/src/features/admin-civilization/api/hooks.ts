"use client";

import { useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  AddCivilizationPlayerInput,
  CivilizationAdminGame,
  CivilizationAdminGameInput,
} from "@/entities/civilization";
import { queryKeys } from "@/shared/config/query-keys";
import {
  clearSuccessfulIdempotencyAttempt,
  getOrCreateIdempotencyKey,
  type IdempotencyAttempt,
  stableRequestFingerprint,
} from "@/shared/lib/idempotency";

import {
  addAdminCivilizationPlayer,
  cancelAdminCivilizationGame,
  createAdminCivilizationGame,
  forceCompleteAdminCivilizationGame,
  getAdminCivilizationAudit,
  getAdminCivilizationGame,
  getAdminCivilizationGames,
  scheduleAdminCivilizationGame,
  updateAdminCivilizationGame,
  validateAdminCivilizationGame,
} from "./requests";

export function useAdminCivilizationGamesQuery(
  page: number,
  limit = 25,
  search = "",
  status?: CivilizationAdminGame["status"],
) {
  return useQuery({
    queryKey: queryKeys.adminCivilizationGamesPage(page, limit, search, status),
    queryFn: () => getAdminCivilizationGames(page, limit, search, status),
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: "always",
  });
}

export function useAdminCivilizationGameQuery(gameId: string) {
  return useQuery({
    queryKey: queryKeys.adminCivilizationGame(gameId),
    queryFn: () => getAdminCivilizationGame(gameId),
    enabled: Boolean(gameId),
  });
}

export function useSaveAdminCivilizationGameMutation(gameId?: string) {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<IdempotencyAttempt | null>(null);

  return useMutation({
    mutationFn: (input: CivilizationAdminGameInput) => {
      const fingerprint = stableRequestFingerprint({
        operation: gameId ? "update" : "create",
        gameId,
        input,
      });
      const idempotencyKey = getOrCreateIdempotencyKey(idempotencyKeyRef, fingerprint);
      return gameId
        ? updateAdminCivilizationGame(gameId, input, idempotencyKey)
        : createAdminCivilizationGame(input, idempotencyKey);
    },
    onSuccess: async (game, input) => {
      clearSuccessfulIdempotencyAttempt(
        idempotencyKeyRef,
        stableRequestFingerprint({ operation: gameId ? "update" : "create", gameId, input }),
      );
      queryClient.setQueryData<CivilizationAdminGame>(
        queryKeys.adminCivilizationGame(game.id),
        game,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.adminCivilizationGames });
    },
  });
}

function useAdminGameActionMutation(
  gameId: string,
  operation: "schedule" | "cancel" | "force-complete",
  action: (gameId: string, idempotencyKey: string) => Promise<unknown>,
) {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<IdempotencyAttempt | null>(null);
  const fingerprint = stableRequestFingerprint({ operation, gameId });

  return useMutation({
    mutationFn: () => {
      return action(gameId, getOrCreateIdempotencyKey(idempotencyKeyRef, fingerprint));
    },
    onSuccess: async () => {
      clearSuccessfulIdempotencyAttempt(idempotencyKeyRef, fingerprint);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminCivilizationGames }),
        queryClient.invalidateQueries({ queryKey: queryKeys.adminCivilizationGame(gameId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.civilizationCurrent }),
      ]);
    },
  });
}

export function useValidateAdminCivilizationGameMutation(gameId: string) {
  return useMutation({ mutationFn: () => validateAdminCivilizationGame(gameId) });
}

export function useScheduleAdminCivilizationGameMutation(gameId: string) {
  return useAdminGameActionMutation(gameId, "schedule", scheduleAdminCivilizationGame);
}

export function useCancelAdminCivilizationGameMutation(gameId: string) {
  return useAdminGameActionMutation(gameId, "cancel", cancelAdminCivilizationGame);
}

export function useForceCompleteAdminCivilizationGameMutation(gameId: string) {
  return useAdminGameActionMutation(gameId, "force-complete", forceCompleteAdminCivilizationGame);
}

export function useAddAdminCivilizationPlayerMutation(gameId: string) {
  const queryClient = useQueryClient();
  const idempotencyKeyRef = useRef<IdempotencyAttempt | null>(null);

  return useMutation({
    mutationFn: (input: AddCivilizationPlayerInput) => {
      const fingerprint = stableRequestFingerprint({ operation: "add-player", gameId, input });
      return addAdminCivilizationPlayer(
        gameId,
        input,
        getOrCreateIdempotencyKey(idempotencyKeyRef, fingerprint),
      );
    },
    onSuccess: async (_, input) => {
      clearSuccessfulIdempotencyAttempt(
        idempotencyKeyRef,
        stableRequestFingerprint({ operation: "add-player", gameId, input }),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.adminCivilizationGame(gameId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.civilizationState(gameId) }),
      ]);
    },
  });
}

export function useAdminCivilizationAuditQuery(gameId: string, page: number, limit = 20) {
  return useQuery({
    queryKey: queryKeys.adminCivilizationAudit(gameId, page, limit),
    queryFn: () => getAdminCivilizationAudit(gameId, page, limit),
    enabled: Boolean(gameId),
    placeholderData: (previous) => previous,
  });
}
