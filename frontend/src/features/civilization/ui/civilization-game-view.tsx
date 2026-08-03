"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  CoinsIcon,
  EyeIcon,
  GiftIcon,
  HistoryIcon,
  RefreshCwIcon,
  ShieldIcon,
  ZapIcon,
} from "lucide-react";
import { toast } from "sonner";

import type {
  CivilizationActionType,
  CivilizationGameState,
  CivilizationLegalAction,
} from "@/entities/civilization";
import { CIVILIZATION_ASSETS } from "@/entities/civilization";
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
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from "@/shared/ui/8bit";

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
      action.towerId
        ? { type: "CATAPULT_ATTACK", actionId, towerId: action.towerId }
        : action.buildingId
          ? {
              type: "CATAPULT_ATTACK",
              actionId,
              townHallBuildingId: action.buildingId,
            }
          : null,
    REPAIR_TOWER: () =>
      action.towerId
        ? { type: "REPAIR_TOWER", actionId, towerId: action.towerId }
        : action.buildingId
          ? {
              type: "REPAIR_TOWER",
              actionId,
              townHallBuildingId: action.buildingId,
            }
          : null,
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
    (action) =>
      action.type !== "BUILD_TOWER" &&
      action.type !== "CATAPULT_ATTACK" &&
      action.type !== "REPAIR_TOWER",
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
  const [selectedItem, setSelectedItem] = useState<
    "BUILD_TOWER" | "CATAPULT_ATTACK" | "REPAIR_TOWER" | null
  >(null);
  const [placementMode, setPlacementMode] = useState<
    "BUILD_TOWER" | "CATAPULT_ATTACK" | "REPAIR_TOWER" | null
  >(null);
  const [battleOutcome, setBattleOutcome] = useState<{
    id: number;
    result: "WON" | "LOST";
  } | null>(null);
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
          if (
            action.type === "ATTACK_PLAYER" &&
            typeof result.event.payload.attackerWon === "boolean"
          ) {
            setBattleOutcome({
              id: Date.now(),
              result: result.event.payload.attackerWon ? "WON" : "LOST",
            });
          }
          clearSelection();
          cancelPlacement();
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
    state.game.status === "COMPLETED" && (closedResultGameId !== state.game.id || resultReopened);
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
    if (placementMode === "REPAIR_TOWER") {
      const repairAction = actionsForTile(state, tileId).find(
        (action) => action.type === "REPAIR_TOWER",
      );
      if (repairAction) requestAction(repairAction);
      else cancelPlacement();
      return;
    }
    const tower = state.towers.find(
      (candidate) => candidate.tileId === tileId && candidate.status !== "CANCELLED",
    );
    if (tower) {
      if (
        tower.status === "DESTROYED" &&
        tower.teamId !== currentPlayer?.teamId &&
        selectedPlayerId === state.access.currentPlayerId
      ) {
        const captureMove = actionsForTile(state, tileId).find((action) => action.type === "MOVE");
        if (captureMove) {
          requestAction(captureMove);
          return;
        }
      }
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
    setSelectedItem("BUILD_TOWER");
  };

  const toggleCatapult = (): void => {
    if (placementMode === "CATAPULT_ATTACK") {
      cancelPlacement();
      return;
    }
    setSelectedItem("CATAPULT_ATTACK");
  };

  const toggleRepairKit = (): void => {
    if (placementMode === "REPAIR_TOWER") {
      cancelPlacement();
      return;
    }
    setSelectedItem("REPAIR_TOWER");
  };

  const useSelectedItem = (): void => {
    if (!selectedItem) {
      return;
    }
    clearSelection();
    setPlacementMode(selectedItem);
    setPlacementTileId(null);
    setSelectedItem(null);
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
        <div className="relative space-y-2 xl:col-start-1 xl:row-start-1">
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
            onToggleRepairKit={toggleRepairKit}
            onCancelPlacement={cancelPlacement}
            onCancelPlacementPreview={() => setPlacementTileId(null)}
            onConfirmPlacement={confirmTowerPlacement}
            className="min-h-130"
          />
          {battleOutcome ? (
            <div
              key={battleOutcome.id}
              className="civilization-battle-outcome pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
              aria-live="assertive"
              onAnimationEnd={() => setBattleOutcome(null)}
            >
              <div
                className={
                  battleOutcome.result === "WON"
                    ? "civilization-battle-outcome-won"
                    : "civilization-battle-outcome-lost"
                }
              >
                YOU {battleOutcome.result}
              </div>
            </div>
          ) : null}
        </div>

        <aside className="space-y-4 xl:sticky xl:top-18 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-start">
          <CivilizationPlayerPanel player={currentPlayer} state={state} />
        </aside>

        <div className="grid gap-4 lg:grid-cols-2 xl:col-start-1 xl:row-start-2">
          {state.teams.map((team) => (
            <CivilizationTeamStatistics key={team.id} team={team} />
          ))}
        </div>
      </div>

      <Dialog open={selectedItem !== null} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-md overflow-hidden p-0">
          <div className="relative flex min-h-36 items-center justify-center border-b bg-slate-950 p-6">
            {selectedItem === "BUILD_TOWER" ? (
              <Image
                src={CIVILIZATION_ASSETS["tower.active"].path}
                alt="Defensive Tower"
                width={112}
                height={112}
                className="size-28 object-contain drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]"
              />
            ) : (
              <Image
                src={
                  selectedItem === "CATAPULT_ATTACK"
                    ? CIVILIZATION_ASSETS["item.catapult"].path
                    : CIVILIZATION_ASSETS["item.repairKit"].path
                }
                alt={selectedItem === "CATAPULT_ATTACK" ? "Catapult" : "Repair Kit"}
                width={112}
                height={112}
                className="size-28 object-contain drop-shadow-[0_0_18px_rgba(34,211,238,0.45)]"
              />
            )}
          </div>
          <div className="space-y-5 p-6">
            <DialogHeader>
              <DialogTitle>
                {selectedItem === "BUILD_TOWER"
                  ? "Defensive Tower"
                  : selectedItem === "CATAPULT_ATTACK"
                    ? "Catapult"
                    : "Repair Kit"}
              </DialogTitle>
              <DialogDescription className="leading-relaxed">
                {selectedItem === "BUILD_TOWER"
                  ? `Build on an adjacent allied hex. Protects territory within ${state.game.settings.tower.protectionRadius} hexes and takes ${state.game.settings.tower.destructionRequiredActions} successful attacks to destroy.`
                  : selectedItem === "CATAPULT_ATTACK"
                    ? `Strike an enemy tower or an adjacent enemy Town Hall for ${state.game.settings.catapult.damage} tower damage actions or Town Hall capture-progress points.`
                    : `Repair an adjacent allied damaged tower or Town Hall. Restores ${state.game.settings.repairKit.repairActions} tower damage actions or Town Hall capture-progress points.`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-px border bg-border text-[10px]">
              <div className="flex items-center gap-2 bg-card p-3">
                <CoinsIcon className="size-4 text-amber-300" />
                <span>
                  {selectedItem === "BUILD_TOWER"
                    ? state.game.settings.tower.buildGoldCost
                    : selectedItem === "CATAPULT_ATTACK"
                      ? state.game.settings.catapult.goldPrice
                      : state.game.settings.repairKit.goldPrice}{" "}
                  gold
                </span>
              </div>
              <div className="flex items-center gap-2 bg-card p-3">
                <ZapIcon className="size-4 text-cyan-300" />
                <span>
                  {(selectedItem === "BUILD_TOWER"
                    ? state.game.settings.costs.towerBuildUnits
                    : selectedItem === "CATAPULT_ATTACK"
                      ? state.game.settings.catapult.actionPointUnits
                      : state.game.settings.costs.towerRepairUnits) / 2}{" "}
                  AP
                </span>
              </div>
              <div className="col-span-2 flex items-center gap-2 bg-card p-3">
                <ShieldIcon className="size-4 text-emerald-300" />
                <span>
                  {selectedItem === "BUILD_TOWER"
                    ? `${state.game.settings.tower.destructionRequiredActions} attacks to destroy`
                    : selectedItem === "CATAPULT_ATTACK"
                      ? `${state.game.settings.catapult.damage} damage ${state.game.settings.catapult.damage === 1 ? "point" : "points"} per strike`
                      : `${state.game.settings.repairKit.repairActions} repair ${state.game.settings.repairKit.repairActions === 1 ? "point" : "points"} per use`}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelectedItem(null)}>
                Back
              </Button>
              <Button type="button" onClick={useSelectedItem}>
                Use
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

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
                    : "None"}
                  .
                </p>
                <p>
                  Final score:{" "}
                  {state.game.teams
                    .map((team) => `${team.name} ${team.finalScore ?? "0"}`)
                    .join(" · ")}
                </p>
                <p>
                  Reason:{" "}
                  {state.game.completionReason === "TOWN_HALL_CAPTURED"
                    ? "Town Hall destroyed"
                    : (state.game.completionReason?.replaceAll("_", " ").toLowerCase() ??
                      "event completion")}
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
