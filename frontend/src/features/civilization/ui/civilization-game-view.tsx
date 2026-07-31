"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { EyeIcon, HistoryIcon, RefreshCwIcon, SwordsIcon } from "lucide-react";
import { toast } from "sonner";

import type { CivilizationActionType, CivilizationLegalAction } from "@/entities/civilization";
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

import { useCivilizationActionMutation, useCivilizationGameStateQuery } from "../api";
import { useCivilizationUiStore } from "../model";
import { civilizationRoutes } from "../routes";
import type { CivilizationActionPayload } from "../api/requests";
import { CivilizationEventLog } from "./civilization-event-log";
import { CivilizationPlayerPanel } from "./civilization-player-panel";
import { CivilizationSelectionPanel } from "./civilization-selection-panel";
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

export function CivilizationGameView({
  gameId,
  isHistorical = false,
}: {
  gameId: string;
  isHistorical?: boolean;
}) {
  const query = useCivilizationGameStateQuery(gameId, isHistorical);
  const actionMutation = useCivilizationActionMutation(gameId);
  const [eventPage, setEventPage] = useState(1);
  const [confirmationAction, setConfirmationAction] = useState<CivilizationLegalAction | null>(
    null,
  );
  const selectedTileId = useCivilizationUiStore((state) => state.selectedTileId);
  const selectedPlayerId = useCivilizationUiStore((state) => state.selectedPlayerId);
  const selectedTowerId = useCivilizationUiStore((state) => state.selectedTowerId);
  const setSelectedTile = useCivilizationUiStore((state) => state.setSelectedTile);
  const setSelectedPlayer = useCivilizationUiStore((state) => state.setSelectedPlayer);
  const setSelectedTower = useCivilizationUiStore((state) => state.setSelectedTower);

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
      actionMutation.mutate(payload, {
        onSuccess: (result) => {
          toast.success(result.event.type.toLowerCase().replaceAll("_", " "));
          setConfirmationAction(null);
        },
      });
    },
    [actionMutation],
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

  const selectTile = (tileId: string): void => {
    setSelectedTile(tileId);
    const tower = state.towers.find(
      (item) => item.tileId === tileId && item.status !== "CANCELLED",
    );
    setSelectedTower(tower?.id ?? null);
  };

  const selectPlayer = (playerId: string): void => {
    const player = state.players.find((item) => item.id === playerId);
    if (player) {
      selectTile(player.currentTileId);
    }
    setSelectedPlayer(playerId);
  };

  const requestAction = (action: CivilizationLegalAction): void => {
    if (readOnly || state.access.isSpectator) {
      return;
    }
    if (action.requiresConfirmation || Number(action.goldCost) > 0) {
      setConfirmationAction(action);
      return;
    }
    submitAction(action);
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
          <div className="grid gap-2 border bg-muted/20 p-2 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-[9px]">
              <span className="shrink-0 text-muted-foreground">Select hex</span>
              <select
                className="h-8 min-w-0 flex-1 border bg-background px-2"
                value={selectedTileId ?? ""}
                onChange={(event) => event.target.value && selectTile(event.target.value)}
              >
                <option value="">Choose a coordinate</option>
                {state.tiles.map((tile) => (
                  <option key={tile.id} value={tile.id}>
                    {tile.coordinate.q}, {tile.coordinate.r} · {tile.terrainType}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[9px]">
              <span className="shrink-0 text-muted-foreground">Select player</span>
              <select
                className="h-8 min-w-0 flex-1 border bg-background px-2"
                value={selectedPlayerId ?? ""}
                onChange={(event) => {
                  if (event.target.value) {
                    selectPlayer(event.target.value);
                  } else {
                    setSelectedPlayer(null);
                  }
                }}
              >
                <option value="">Choose a player</option>
                {state.players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.username} ·{" "}
                    {state.teams.find((team) => team.id === player.teamId)?.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <CivilizationGameMap
            state={state}
            selectedTileId={selectedTileId}
            selectedPlayerId={selectedPlayerId}
            selectedTowerId={selectedTowerId}
            isInteractionDisabled={false}
            onSelectTile={selectTile}
            onSelectPlayer={selectPlayer}
            className="min-h-130"
          />
        </div>

        <aside className="space-y-4 xl:sticky xl:top-18 xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:self-start">
          <CivilizationPlayerPanel player={currentPlayer} state={state} />
          <CivilizationSelectionPanel
            state={state}
            selectedTileId={selectedTileId}
            selectedPlayerId={selectedPlayerId}
            onAction={requestAction}
            isPending={actionMutation.isPending || readOnly || state.access.isSpectator}
          />
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

        <div className="space-y-4 xl:col-start-1 xl:row-start-2">
          <div className="grid gap-4 lg:grid-cols-2">
            {state.teams.map((team) => (
              <CivilizationTeamStatistics key={team.id} team={team} />
            ))}
          </div>

          <CivilizationEventLog
            gameId={gameId}
            page={eventPage}
            isActive={state.game.status === "ACTIVE"}
            onPageChange={setEventPage}
          />
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
    </section>
  );
}
