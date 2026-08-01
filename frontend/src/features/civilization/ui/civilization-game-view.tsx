"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { EyeIcon, GiftIcon, HistoryIcon, RefreshCwIcon, SwordsIcon } from "lucide-react";
import { toast } from "sonner";

import type {
  CivilizationActionType,
  CivilizationGameState,
  CivilizationLegalAction,
} from "@/entities/civilization";
import { getApiRequestErrorMessage } from "@/shared/lib/api-request";
import { formatDateTime } from "@/shared/lib/date-time";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button, Card, CardContent, Skeleton } from "@/shared/ui/8bit";

import {
  useCivilizationActionMutation,
  useCivilizationGameStateQuery,
  useClaimCivilizationRewardMutation,
} from "../api";
import { coordinateKey, useCivilizationUiStore } from "../model";
import { civilizationRoutes } from "../routes";
import type { CivilizationActionPayload } from "../api/requests";
import { CivilizationPlayerPanel } from "./civilization-player-panel";
import { CivilizationStatusBadge } from "./civilization-status-badge";
import { CivilizationTeamStatistics } from "./civilization-team-statistics";

const CivilizationGameMap = dynamic(
  () => import("./civilization-game-map").then((module) => module.CivilizationGameMap),
  {
    ssr: false,
    loading: () => <Skeleton className="min-h-105 w-full" />,
  },
);

function buildActionPayload(action: CivilizationLegalAction): CivilizationActionPayload | null {
  const actionId = crypto.randomUUID();
  const builders: Record<CivilizationActionType, () => CivilizationActionPayload | null> = {
    MOVE: () =>
      action.targetCoordinate ? { type: "MOVE", actionId, target: action.targetCoordinate } : null,
    ATTACK_PLAYER: () =>
      action.targetPlayerId
        ? { type: "ATTACK_PLAYER", actionId, targetPlayerId: action.targetPlayerId }
        : null,
    CAPTURE_BUILDING: () =>
      action.buildingId
        ? { type: "CAPTURE_BUILDING", actionId, buildingId: action.buildingId }
        : null,
    BUILD_TOWER: () =>
      action.targetCoordinate
        ? { type: "BUILD_TOWER", actionId, tile: action.targetCoordinate }
        : null,
    ATTACK_TOWER: () =>
      action.towerId ? { type: "ATTACK_TOWER", actionId, towerId: action.towerId } : null,
    CATAPULT_ATTACK: () =>
      action.towerId ? { type: "CATAPULT_ATTACK", actionId, towerId: action.towerId } : null,
    REPAIR_TOWER: () =>
      action.towerId ? { type: "REPAIR_TOWER", actionId, towerId: action.towerId } : null,
    CAPTURE_TOWN_HALL: () =>
      action.buildingId
        ? {
            type: "CAPTURE_TOWN_HALL",
            actionId,
            townHallBuildingId: action.buildingId,
          }
        : null,
    DEFEND_TOWN_HALL: () =>
      action.buildingId
        ? {
            type: "DEFEND_TOWN_HALL",
            actionId,
            townHallBuildingId: action.buildingId,
          }
        : null,
  };
  return builders[action.type]();
}

function actionsForTile(state: CivilizationGameState, tileId: string): CivilizationLegalAction[] {
  const tile = state.tiles.find((item) => item.id === tileId);
  if (!tile) {
    return [];
  }

  return state.availableActions.filter(
    (action) =>
      action.disabledReason === null &&
      action.targetCoordinate !== undefined &&
      coordinateKey(action.targetCoordinate) === coordinateKey(tile.coordinate),
  );
}

function automaticActionForTile(
  state: CivilizationGameState,
  tileId: string,
): CivilizationLegalAction | null {
  const actions = actionsForTile(state, tileId).filter(
    (action) => action.type !== "BUILD_TOWER" && action.type !== "CATAPULT_ATTACK",
  );
  const interactions = actions.filter((action) => action.type !== "MOVE");
  if (interactions.length === 1) {
    return interactions[0] ?? null;
  }
  return actions.length === 1 ? (actions[0] ?? null) : null;
}

export function CivilizationGameView({
  gameId,
  isHistorical = false,
}: {
  gameId: string;
  isHistorical?: boolean;
}) {
  const query = useCivilizationGameStateQuery(gameId, isHistorical);
  const actionMutation = useCivilizationActionMutation(gameId);
  const claimRewardMutation = useClaimCivilizationRewardMutation(gameId);
  const [confirmationAction, setConfirmationAction] = useState<CivilizationLegalAction | null>(
    null,
  );
  const [placementMode, setPlacementMode] = useState<
    "BUILD_TOWER" | "CATAPULT_ATTACK" | null
  >(null);
  const [placementTileId, setPlacementTileId] = useState<string | null>(null);
  const [closedResultGameId, setClosedResultGameId] = useState<string | null>(null);
  const [resultReopened, setResultReopened] = useState(false);
  const actionRequestPendingRef = useRef(false);
  const selectedTileId = useCivilizationUiStore((state) => state.selectedTileId);
  const selectedPlayerId = useCivilizationUiStore((state) => state.selectedPlayerId);
  const selectedTowerId = useCivilizationUiStore((state) => state.selectedTowerId);
  const setSelectedTile = useCivilizationUiStore((state) => state.setSelectedTile);
  const setSelectedPlayer = useCivilizationUiStore((state) => state.setSelectedPlayer);
  const setSelectedTower = useCivilizationUiStore((state) => state.setSelectedTower);
  const clearSelection = useCivilizationUiStore((state) => state.clearSelection);

  const cancelPlacement = useCallback((): void => {
    setPlacementMode(null);
    setPlacementTileId(null);
  }, []);

  useEffect(() => {
    if (!placementMode) {
      return;
    }
    const cancelOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        cancelPlacement();
      }
    };
    window.addEventListener("keydown", cancelOnEscape);
    return () => window.removeEventListener("keydown", cancelOnEscape);
  }, [cancelPlacement, placementMode]);

  const currentPlayer = useMemo(
    () =>
      query.data?.players.find((player) => player.id === query.data.access.currentPlayerId) ?? null,
    [query.data],
  );

  const submitAction = useCallback(
    (action: CivilizationLegalAction): void => {
      const payload = buildActionPayload(action);
      if (!payload) {
        toast.error("The server action is missing its target.");
        return;
      }
      if (actionRequestPendingRef.current) {
        return;
      }
      actionRequestPendingRef.current = true;
      actionMutation.mutate(payload, {
        onSuccess: (result) => {
          toast.success(result.event.type.toLowerCase().replaceAll("_", " "));
          clearSelection();
          cancelPlacement();
          setConfirmationAction(null);
        },
        onError: (error) => {
          toast.error(
            getApiRequestErrorMessage(
              error,
              action.type === "MOVE"
                ? "Unable to move the player."
                : "Unable to complete the action.",
            ),
          );
        },
        onSettled: () => {
          actionRequestPendingRef.current = false;
        },
      });
    },
    [actionMutation, cancelPlacement, clearSelection],
  );

  if (query.isPending) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
          <Skeleton className="min-h-130 w-full" />
          <div className="space-y-4">
            <Skeleton className="h-52 w-full" />
            <Skeleton className="h-52 w-full" />
          </div>
        </div>
      </section>
    );
  }

  if (query.isError) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-destructive">{getApiRequestErrorMessage(query.error)}</p>
          <Button type="button" variant="outline" onClick={() => query.refetch()}>
            <RefreshCwIcon className="size-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const state = query.data;
  const readOnly = isHistorical || state.access.isReadOnly || state.game.status !== "ACTIVE";
  const resultOpen =
    state.game.status === "COMPLETED" &&
    (closedResultGameId !== state.game.id || resultReopened);
  const setResultDialogOpen = (open: boolean): void => {
    if (open) {
      setResultReopened(true);
      return;
    }
    setClosedResultGameId(state.game.id);
    setResultReopened(false);
  };

  const selectTile = (tileId: string): void => {
    setSelectedTile(tileId);
    const tower = state.towers.find(
      (item) => item.tileId === tileId && item.status !== "CANCELLED",
    );
    setSelectedTower(tower?.id ?? null);
  };

  const selectPlayer = (playerId: string): void => {
    if (placementMode) {
      cancelPlacement();
      return;
    }
    if (selectedPlayerId === state.access.currentPlayerId && playerId !== selectedPlayerId) {
      const attackAction = state.availableActions.find(
        (action) =>
          action.type === "ATTACK_PLAYER" &&
          action.targetPlayerId === playerId &&
          action.disabledReason === null,
      );
      if (attackAction) {
        requestAction(attackAction);
      }
      return;
    }
    if (playerId !== state.access.currentPlayerId) {
      return;
    }
    if (selectedPlayerId === playerId) {
      clearSelection();
      return;
    }

    const player = state.players.find((item) => item.id === playerId);
    if (player) {
      selectTile(player.currentTileId);
    }
    setSelectedPlayer(playerId);
  };

  const requestAction = (action: CivilizationLegalAction): void => {
    if (readOnly || state.access.isSpectator || actionMutation.isPending) {
      return;
    }
    if (action.requiresConfirmation || Number(action.goldCost) > 0) {
      setConfirmationAction(action);
      return;
    }
    submitAction(action);
  };

  const selectTileOrAct = (tileId: string): void => {
    if (placementMode === "CATAPULT_ATTACK") {
      const catapultAction = actionsForTile(state, tileId).find(
        (action) => action.type === "CATAPULT_ATTACK",
      );
      if (catapultAction) requestAction(catapultAction);
      else cancelPlacement();
      return;
    }
    if (placementMode === "BUILD_TOWER") {
      const buildAction = actionsForTile(state, tileId).find(
        (action) => action.type === "BUILD_TOWER",
      );
      if (buildAction) {
        setPlacementTileId(tileId);
      } else {
        cancelPlacement();
      }
      return;
    }
    const tower = state.towers.find(
      (candidate) => candidate.tileId === tileId && candidate.status !== "CANCELLED",
    );
    if (tower) {
      clearSelection();
      setSelectedTile(tileId);
      setSelectedTower(tower.id);
      return;
    }
    if (selectedPlayerId === state.access.currentPlayerId) {
      const action = automaticActionForTile(state, tileId);
      if (action) {
        requestAction(action);
      } else {
        clearSelection();
      }
      return;
    }

    selectTile(tileId);
  };

  const toggleTowerPlacement = (): void => {
    if (placementMode === "BUILD_TOWER") {
      cancelPlacement();
      return;
    }
    clearSelection();
    setPlacementMode("BUILD_TOWER");
    setPlacementTileId(null);
  };

  const toggleCatapult = (): void => {
    if (placementMode === "CATAPULT_ATTACK") {
      cancelPlacement();
      return;
    }
    clearSelection();
    setPlacementMode("CATAPULT_ATTACK");
    setPlacementTileId(null);
  };

  const confirmTowerPlacement = (): void => {
    if (!placementTileId || actionMutation.isPending) {
      return;
    }
    const action = actionsForTile(state, placementTileId).find(
      (candidate) => candidate.type === "BUILD_TOWER",
    );
    if (action) {
      submitAction(action);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-lg font-semibold">{state.game.name}</h1>
            <CivilizationStatusBadge status={state.game.status} />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {formatDateTime(state.game.startAt)} — {formatDateTime(state.game.endAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.access.isSpectator ? (
            <span className="inline-flex items-center gap-2 border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-[10px] text-blue-200">
              <EyeIcon className="size-4" /> Spectator mode
            </span>
          ) : null}
          {readOnly ? (
            <span className="inline-flex items-center gap-2 border border-slate-400/40 bg-slate-500/10 px-3 py-2 text-[10px] text-slate-200">
              <HistoryIcon className="size-4" /> Read-only snapshot
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCwIcon className={query.isFetching ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
          {state.game.status === "COMPLETED" && !resultOpen ? (
            <Button type="button" variant="outline" onClick={() => setResultReopened(true)}>
              <GiftIcon className="size-4" /> View result
            </Button>
          ) : null}
          <Button asChild type="button" variant="outline">
            <Link href={civilizationRoutes.history}>History</Link>
          </Button>
        </div>
      </header>

      {actionMutation.isError ? (
        <div className="border border-destructive/60 bg-destructive/10 p-3 text-xs text-destructive">
          {getApiRequestErrorMessage(actionMutation.error)}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="space-y-2 xl:col-start-1 xl:row-start-1">
          <CivilizationGameMap
            state={state}
            selectedTileId={selectedTileId}
            selectedPlayerId={selectedPlayerId}
            selectedTowerId={selectedTowerId}
            placementMode={placementMode}
            placementTileId={placementTileId}
            isInteractionDisabled={actionMutation.isPending}
            onSelectTile={selectTileOrAct}
            onSelectPlayer={selectPlayer}
            onCancelSelection={clearSelection}
            onToggleTowerPlacement={toggleTowerPlacement}
            onToggleCatapult={toggleCatapult}
            onCancelPlacement={cancelPlacement}
            onCancelPlacementPreview={() => setPlacementTileId(null)}
            onConfirmPlacement={confirmTowerPlacement}
            className="min-h-130"
          />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-18 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-start">
          <CivilizationPlayerPanel player={currentPlayer} state={state} />
          <Card>
            <CardContent className="p-4 text-[9px] text-muted-foreground">
              <p className="flex items-center gap-2 text-foreground">
                <SwordsIcon className="size-4" /> Server-authoritative actions
              </p>
              <p className="mt-2 leading-relaxed">
                Movement, costs, combat rolls, ownership and resource results are validated by the
                server. The map only previews actions the server currently reports as legal.
              </p>
            </CardContent>
          </Card>
        </aside>

        <div className="grid gap-4 lg:grid-cols-2 xl:col-start-1 xl:row-start-2">
          {state.teams.map((team) => (
            <CivilizationTeamStatistics key={team.id} team={team} />
          ))}
        </div>
      </div>

      <AlertDialog
        open={Boolean(confirmationAction)}
        onOpenChange={(open) => !open && setConfirmationAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm team resource spending</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmationAction?.label ?? "This action"} costs{" "}
              {confirmationAction?.actionPointUnits ? confirmationAction.actionPointUnits / 2 : 0}{" "}
              AP
              {confirmationAction && Number(confirmationAction.goldCost) > 0
                ? ` and ${confirmationAction.goldCost} team gold`
                : ""}
              . The result is final after the server accepts it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionMutation.isPending || !confirmationAction}
              onClick={(event) => {
                event.preventDefault();
                if (confirmationAction) {
                  submitAction(confirmationAction);
                }
              }}
            >
              {actionMutation.isPending ? "Submitting..." : "Confirm action"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resultOpen} onOpenChange={setResultDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Game result</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>
                  Winner: {state.game.winnerTeam?.name ?? "Draw"}. Loser:{" "}
                  {state.game.winnerTeamId
                    ? (state.game.teams.find((team) => team.id !== state.game.winnerTeamId)?.name ??
                      "None")
                    : "None"}.
                </p>
                <p>
                  Final score: {state.game.teams.map((team) => `${team.name} ${team.finalScore ?? "0"}`).join(" · ")}
                </p>
                <p>
                  Reason:{" "}
                  {state.game.completionReason === "TOWN_HALL_CAPTURED"
                    ? "Town Hall destroyed"
                    : state.game.completionReason?.replaceAll("_", " ").toLowerCase() ??
                      "event completion"}
                </p>
                {state.rewardClaim ? (
                  state.rewardClaim.eligible ? (
                    <p>
                      Reward: {state.rewardClaim.reward.gold} gold
                      {state.rewardClaim.claimedAt
                        ? ` · Claimed ${formatDateTime(state.rewardClaim.claimedAt)}`
                        : " · Ready to claim"}
                    </p>
                  ) : (
                    <p className="text-destructive">
                      {state.rewardClaim.unavailableReason ?? "No reward is available."}
                    </p>
                  )
                ) : (
                  <p>No reward is available for this account.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {claimRewardMutation.isError ? (
            <p className="text-xs text-destructive">
              {getApiRequestErrorMessage(claimRewardMutation.error, "Unable to claim reward.")}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={claimRewardMutation.isPending}>Close</AlertDialogCancel>
            {state.rewardClaim?.eligible && !state.rewardClaim.claimedAt ? (
              <AlertDialogAction
                disabled={claimRewardMutation.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  claimRewardMutation.mutate(undefined, {
                    onSuccess: () => toast.success("Civilization reward claimed."),
                  });
                }}
              >
                {claimRewardMutation.isPending ? "Claiming..." : "Claim reward"}
              </AlertDialogAction>
            ) : null}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
