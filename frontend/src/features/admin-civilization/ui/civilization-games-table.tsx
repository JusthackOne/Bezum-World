"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { compareDesc, parseISO } from "date-fns";
import {
  BanIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SearchIcon,
  SquareCheckBigIcon,
} from "lucide-react";
import { toast } from "sonner";

import type { CivilizationGameStatus, CivilizationGameSummary } from "@/entities/civilization";
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
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/8bit";

import {
  useAdminCivilizationGamesQuery,
  useCancelAdminCivilizationGameMutation,
  useForceCompleteAdminCivilizationGameMutation,
} from "../api";
import { adminCivilizationRoutes } from "../routes";

type ConfirmAction = { type: "cancel" | "complete"; game: CivilizationGameSummary } | null;

function CivilizationRowActions({
  game,
  onConfirm,
}: {
  game: CivilizationGameSummary;
  onConfirm: (action: Exclude<ConfirmAction, null>) => void;
}) {
  const editable = game.status === "DRAFT" || game.status === "SCHEDULED";
  return (
    <div className="flex justify-end gap-1">
      <Button asChild size="icon" variant="outline">
        <Link href={adminCivilizationRoutes.details(game.id)} aria-label={`View ${game.name}`}>
          <EyeIcon className="size-4" />
        </Link>
      </Button>
      {editable ? (
        <Button asChild size="icon" variant="outline">
          <Link href={adminCivilizationRoutes.edit(game.id)} aria-label={`Edit ${game.name}`}>
            <PencilIcon className="size-4" />
          </Link>
        </Button>
      ) : null}
      {game.status === "SCHEDULED" || game.status === "ACTIVE" ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={`Cancel ${game.name}`}
          onClick={() => onConfirm({ type: "cancel", game })}
        >
          <BanIcon className="size-4" />
        </Button>
      ) : null}
      {game.status === "ACTIVE" ? (
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={`Force-complete ${game.name}`}
          onClick={() => onConfirm({ type: "complete", game })}
        >
          <SquareCheckBigIcon className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

function ConfirmGameAction({
  action,
  onClose,
}: {
  action: Exclude<ConfirmAction, null>;
  onClose: () => void;
}) {
  const cancel = useCancelAdminCivilizationGameMutation(action.game.id);
  const complete = useForceCompleteAdminCivilizationGameMutation(action.game.id);
  const mutation = action.type === "cancel" ? cancel : complete;
  const execute = async (): Promise<void> => {
    try {
      await mutation.mutateAsync();
      toast.success(action.type === "cancel" ? "Game cancelled." : "Game force-completed.");
      onClose();
    } catch {
      // React Query retains the structured error for the confirmation dialog.
    }
  };
  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {action.type === "cancel" ? "Cancel" : "Force-complete"} {action.game.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This is an audited administrative operation. Active games settle resources before the
            lifecycle transition, and the operation cannot be undone from this screen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {mutation.isError ? (
          <p className="text-xs text-destructive">{mutation.error.message}</p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>Keep game</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={(event) => {
              event.preventDefault();
              void execute();
            }}
          >
            {mutation.isPending ? "Processing..." : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function CivilizationGamesTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CivilizationGameStatus | "ALL">("ALL");
  const deferredSearch = useDeferredValue(search.trim());
  const query = useAdminCivilizationGamesQuery(
    page,
    25,
    deferredSearch,
    status === "ALL" ? undefined : status,
  );
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const games = useMemo(
    () =>
      [...(query.data?.items ?? [])].sort((left, right) =>
        compareDesc(parseISO(left.createdAt), parseISO(right.createdAt)),
      ),
    [query.data],
  );
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / (query.data?.limit ?? 25)));

  useEffect(() => {
    if (page <= totalPages) return;
    const timer = window.setTimeout(() => setPage(totalPages), 0);
    return () => window.clearTimeout(timer);
  }, [page, totalPages]);

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Civilization</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Configure asynchronous team strategy games and inspect audited lifecycle operations.
          </p>
        </div>
        <Button asChild>
          <Link href={adminCivilizationRoutes.create}>
            <PlusIcon className="size-4" /> Create game
          </Link>
        </Button>
      </header>

      <div className="flex flex-col gap-3 md:flex-row">
        <div className="relative flex-1">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            className="pl-9"
            placeholder="Search by game name"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="h-9 border bg-background px-3 text-xs"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as CivilizationGameStatus | "ALL");
            setPage(1);
          }}
        >
          {(["ALL", "DRAFT", "SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"] as const).map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetching}
          onClick={() => query.refetch()}
        >
          <RefreshCwIcon className={query.isFetching ? "size-4 animate-spin" : "size-4"} /> Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {query.isPending
              ? "Loading games..."
              : `${games.length} shown of ${query.data?.total ?? 0} games`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Window</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Players</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isPending ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Loading Civilization games...
                    </TableCell>
                  </TableRow>
                ) : query.isError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-destructive">
                      {query.error.message}
                    </TableCell>
                  </TableRow>
                ) : games.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No games match these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  games.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell className="font-medium">{game.name}</TableCell>
                      <TableCell>
                        <CivilizationStatusBadge status={game.status} />
                      </TableCell>
                      <TableCell className="text-[9px] whitespace-nowrap">
                        {formatDateTime(game.startAt, "short")}
                        <br />
                        {formatDateTime(game.endAt, "short")}
                      </TableCell>
                      <TableCell>{game.teams.map((team) => team.name).join(" / ")}</TableCell>
                      <TableCell>{game.playerCount}</TableCell>
                      <TableCell>{game.winnerTeam?.name ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatDateTime(game.createdAt, "short")}
                      </TableCell>
                      <TableCell>
                        <CivilizationRowActions game={game} onConfirm={setConfirmAction} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <span className="text-[10px] text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={page <= 1 || query.isFetching}
          aria-label="Previous admin game page"
          onClick={() => setPage((current) => current - 1)}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={page >= totalPages || query.isFetching}
          aria-label="Next admin game page"
          onClick={() => setPage((current) => current + 1)}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      {confirmAction ? (
        <ConfirmGameAction action={confirmAction} onClose={() => setConfirmAction(null)} />
      ) : null}
    </section>
  );
}
