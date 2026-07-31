"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BanIcon,
  CalendarCheckIcon,
  CheckCircle2Icon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SquareCheckBigIcon,
} from "lucide-react";
import { toast } from "sonner";

import type {
  AddCivilizationPlayerInput,
  CivilizationAdminGameInput,
} from "@/entities/civilization";
import { useAdminUsersQuery } from "@/features/admin-users/api";
import { useAdminAuthStore } from "@/features/auth/model";
import { CivilizationStatusBadge } from "@/features/civilization/ui";
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
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/shared/ui/8bit";

import {
  useAddAdminCivilizationPlayerMutation,
  useAdminCivilizationGameQuery,
  useCancelAdminCivilizationGameMutation,
  useForceCompleteAdminCivilizationGameMutation,
  useScheduleAdminCivilizationGameMutation,
  useValidateAdminCivilizationGameMutation,
} from "../api";
import { adminCivilizationRoutes } from "../routes";
import { CivilizationAuditLog } from "./civilization-audit-log";

const CivilizationMapEditor = dynamic(
  () => import("./civilization-map-editor").then((module) => module.CivilizationMapEditor),
  { ssr: false, loading: () => <Skeleton className="min-h-130 w-full" /> },
);

type LifecycleAction = "schedule" | "cancel" | "complete";

export function CivilizationGameDetails({ gameId }: { gameId: string }) {
  const query = useAdminCivilizationGameQuery(gameId);
  const validateMutation = useValidateAdminCivilizationGameMutation(gameId);
  const scheduleMutation = useScheduleAdminCivilizationGameMutation(gameId);
  const cancelMutation = useCancelAdminCivilizationGameMutation(gameId);
  const completeMutation = useForceCompleteAdminCivilizationGameMutation(gameId);
  const addPlayerMutation = useAddAdminCivilizationPlayerMutation(gameId);
  const authInitialized = useAdminAuthStore((state) => state.isInitialized);
  const hasAdminSession = useAdminAuthStore((state) => Boolean(state.session));
  const usersQuery = useAdminUsersQuery(authInitialized, hasAdminSession);
  const [confirmation, setConfirmation] = useState<LifecycleAction | null>(null);
  const [newPlayer, setNewPlayer] = useState<AddCivilizationPlayerInput>({
    userId: "",
    teamId: "",
    spawnTileId: "",
  });
  const users = useMemo(
    () =>
      (usersQuery.data ?? []).map((user) => ({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
      })),
    [usersQuery.data],
  );

  if (query.isPending) return <Skeleton className="min-h-130 w-full" />;
  if (query.isError) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6">
          <p className="text-xs text-destructive">{query.error.message}</p>
          <Button type="button" variant="outline" onClick={() => query.refetch()}>
            <RefreshCwIcon className="size-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const game = query.data;
  const teamA = game.teams.find((team) => team.side === "TEAM_A");
  const teamB = game.teams.find((team) => team.side === "TEAM_B");
  const editorTeams: CivilizationAdminGameInput["teams"] = [
    teamA
      ? {
          id: teamA.id,
          side: "TEAM_A" as const,
          name: teamA.name,
          color: teamA.color,
          visualKey: teamA.visualKey,
          playerIds: teamA.playerIds,
        }
      : {
          side: "TEAM_A" as const,
          name: "Team A",
          color: "#4f7cff",
          visualKey: "team-a",
          playerIds: [],
        },
    teamB
      ? {
          id: teamB.id,
          side: "TEAM_B" as const,
          name: teamB.name,
          color: teamB.color,
          visualKey: teamB.visualKey,
          playerIds: teamB.playerIds,
        }
      : {
          side: "TEAM_B" as const,
          name: "Team B",
          color: "#ef476f",
          visualKey: "team-b",
          playerIds: [],
        },
  ];
  const visibleValidation = validateMutation.data?.issues ?? game.configurationErrors;
  const lifecycleMutation =
    confirmation === "schedule"
      ? scheduleMutation
      : confirmation === "cancel"
        ? cancelMutation
        : completeMutation;

  const executeLifecycleAction = async (): Promise<void> => {
    if (!confirmation) return;
    try {
      await lifecycleMutation.mutateAsync();
      toast.success(
        confirmation === "schedule"
          ? "Game scheduled."
          : confirmation === "cancel"
            ? "Game cancelled."
            : "Game force-completed.",
      );
      setConfirmation(null);
    } catch {
      // React Query retains the structured error for the confirmation dialog.
    }
  };

  const addPlayer = async (): Promise<void> => {
    try {
      await addPlayerMutation.mutateAsync(newPlayer);
      toast.success("Player added to the active game and audit log.");
      setNewPlayer({ userId: "", teamId: "", spawnTileId: "" });
    } catch {
      // React Query retains the structured error for the add-player panel.
    }
  };

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold">{game.name}</h1>
            <CivilizationStatusBadge status={game.status} />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {formatDateTime(game.startAt)} — {formatDateTime(game.endAt)} · created{" "}
            {formatDateTime(game.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {game.status === "DRAFT" || game.status === "SCHEDULED" ? (
            <Button asChild variant="outline">
              <Link href={adminCivilizationRoutes.edit(game.id)}>
                <PencilIcon className="size-4" /> Edit
              </Link>
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={validateMutation.isPending}
            onClick={() => validateMutation.mutate()}
          >
            <CheckCircle2Icon className="size-4" /> Validate
          </Button>
          {game.status === "DRAFT" ? (
            <Button type="button" onClick={() => setConfirmation("schedule")}>
              <CalendarCheckIcon className="size-4" /> Schedule
            </Button>
          ) : null}
          {game.status === "SCHEDULED" || game.status === "ACTIVE" ? (
            <Button type="button" variant="destructive" onClick={() => setConfirmation("cancel")}>
              <BanIcon className="size-4" /> Cancel
            </Button>
          ) : null}
          {game.status === "ACTIVE" ? (
            <Button type="button" variant="outline" onClick={() => setConfirmation("complete")}>
              <SquareCheckBigIcon className="size-4" /> Force complete
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={adminCivilizationRoutes.list}>All games</Link>
          </Button>
        </div>
      </header>

      {validateMutation.isError ? (
        <p className="border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
          {validateMutation.error.message}
        </p>
      ) : null}
      {validateMutation.data ? (
        <div
          className={
            validateMutation.data.valid
              ? "border border-emerald-400/50 bg-emerald-500/10 p-3 text-xs text-emerald-300"
              : "border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive"
          }
        >
          {validateMutation.data.valid
            ? "Server validation passed. This game can be scheduled."
            : `Server validation found ${validateMutation.data.issues.length} issues.`}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {game.teams.map((team) => (
          <Card key={team.id}>
            <div className="h-1.5" style={{ backgroundColor: team.color }} />
            <CardContent className="p-4 text-xs">
              <p className="font-semibold">{team.name}</p>
              <p className="mt-2 text-muted-foreground">
                {team.playerIds.length} assigned players · {team.side}
              </p>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="p-4 text-xs">
            <p className="text-muted-foreground">Map</p>
            <p className="mt-2">
              {game.map.tiles.length} hexes · {game.map.buildings.length} buildings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-xs">
            <p className="text-muted-foreground">Result</p>
            <p className="mt-2">{game.winnerTeam?.name ?? "Not decided"}</p>
          </CardContent>
        </Card>
      </div>

      {visibleValidation.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Configuration issues</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 md:grid-cols-2">
              {visibleValidation.map((issue, index) => (
                <li
                  key={`${issue.code}:${index}`}
                  className="border border-destructive/40 bg-destructive/10 p-3 text-[10px] text-destructive"
                >
                  <strong>{issue.code}</strong>: {issue.message}
                  {issue.coordinate ? ` (${issue.coordinate.q}, ${issue.coordinate.r})` : ""}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Map configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <CivilizationMapEditor
            value={game.map}
            teams={editorTeams}
            settings={game.settings}
            users={users}
            issues={visibleValidation}
            disabled
            onChange={() => undefined}
          />
        </CardContent>
      </Card>

      {game.status === "ACTIVE" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusIcon className="size-4" /> Add player after start
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-2 text-xs">
                <span className="block text-muted-foreground">User</span>
                <select
                  className="h-9 w-full border bg-background px-3"
                  value={newPlayer.userId}
                  onChange={(event) =>
                    setNewPlayer((current) => ({ ...current, userId: event.target.value }))
                  }
                >
                  <option value="">Select user</option>
                  {users
                    .filter((user) => !game.teams.some((team) => team.playerIds.includes(user.id)))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.username}
                      </option>
                    ))}
                </select>
              </label>
              <label className="space-y-2 text-xs">
                <span className="block text-muted-foreground">Team</span>
                <select
                  className="h-9 w-full border bg-background px-3"
                  value={newPlayer.teamId}
                  onChange={(event) =>
                    setNewPlayer((current) => ({
                      ...current,
                      teamId: event.target.value,
                      spawnTileId: "",
                    }))
                  }
                >
                  <option value="">Select team</option>
                  {game.teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-xs">
                <span className="block text-muted-foreground">Spawn point</span>
                <select
                  className="h-9 w-full border bg-background px-3"
                  value={newPlayer.spawnTileId}
                  onChange={(event) =>
                    setNewPlayer((current) => ({ ...current, spawnTileId: event.target.value }))
                  }
                >
                  <option value="">Select spawn</option>
                  {game.map.spawnPoints
                    .filter(
                      (spawn) =>
                        game.teams.find((team) => team.id === newPlayer.teamId)?.side ===
                        spawn.teamSide,
                    )
                    .map((spawn) => (
                      <option
                        key={`${spawn.q}:${spawn.r}`}
                        value={spawn.tileId ?? ""}
                        disabled={!spawn.tileId}
                      >
                        {spawn.q}, {spawn.r}
                        {spawn.tileId ? "" : " (tile ID unavailable)"}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            {addPlayerMutation.isError ? (
              <p className="text-xs text-destructive">{addPlayerMutation.error.message}</p>
            ) : null}
            <Button
              type="button"
              disabled={
                !newPlayer.userId ||
                !newPlayer.teamId ||
                !newPlayer.spawnTileId ||
                addPlayerMutation.isPending
              }
              onClick={() => void addPlayer()}
            >
              {addPlayerMutation.isPending ? "Adding..." : "Add player and audit"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <CivilizationAuditLog gameId={gameId} />

      {confirmation ? (
        <AlertDialog open onOpenChange={(open) => !open && setConfirmation(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmation === "schedule"
                  ? "Schedule this game?"
                  : confirmation === "cancel"
                    ? "Cancel this game?"
                    : "Force-complete this game?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                This lifecycle transition is validated, transactional, and written to the
                administrative audit log.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {lifecycleMutation.isError ? (
              <p className="text-xs text-destructive">{lifecycleMutation.error.message}</p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={lifecycleMutation.isPending}>Back</AlertDialogCancel>
              <AlertDialogAction
                disabled={lifecycleMutation.isPending}
                onClick={(event) => {
                  event.preventDefault();
                  void executeLifecycleAction();
                }}
              >
                {lifecycleMutation.isPending ? "Processing..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </section>
  );
}
