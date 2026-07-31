"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon, MapIcon } from "lucide-react";

import { CIVILIZATION_ATTRIBUTE_KEYS } from "@/entities/civilization";
import { formatNumber } from "@/shared/lib/number-format";
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/shared/ui/8bit";
import { formatDateTime } from "@/shared/lib/date-time";

import { useCivilizationHistoryQuery } from "../api";
import { civilizationRoutes } from "../routes";
import { CivilizationStatusBadge } from "./civilization-status-badge";

export function CivilizationHistoryPage() {
  const [page, setPage] = useState(1);
  const query = useCivilizationHistoryQuery(page);
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / (query.data?.limit ?? 12)));

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Civilization history</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Completed game snapshots, newest first.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={civilizationRoutes.current}>Current game</Link>
        </Button>
      </header>

      {query.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-64 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">{query.error.message}</CardContent>
        </Card>
      ) : query.data.items.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No historical Civilization games are available.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {query.data.items.map((game) => (
            <Card key={game.id} className="flex flex-col">
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-sm">{game.name}</CardTitle>
                  <CivilizationStatusBadge status={game.status} />
                </div>
                <p className="text-[9px] text-muted-foreground">
                  {formatDateTime(game.startAt)} — {formatDateTime(game.endAt)}
                </p>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 text-[10px]">
                <div className="space-y-2">
                  {game.teams.map((team) => (
                    <div
                      key={team.id}
                      className="border-l-4 bg-muted/20 p-2"
                      style={{ borderColor: team.color }}
                    >
                      <div className="flex justify-between gap-2">
                        <span>{team.name}</span>
                        <span>{team.finalScore ?? "—"} pts</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">
                        Gold {formatNumber(team.finalGold ?? "0")} · {team.playerCount} players
                      </p>
                      {team.finalAttributes ? (
                        <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[8px] text-muted-foreground">
                          {CIVILIZATION_ATTRIBUTE_KEYS.map((attributeKey) => (
                            <div key={attributeKey} className="flex justify-between gap-2">
                              <dt className="capitalize">{attributeKey}</dt>
                              <dd>{formatNumber(team.finalAttributes?.[attributeKey] ?? "0")}</dd>
                            </div>
                          ))}
                        </dl>
                      ) : null}
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground">
                  Result:{" "}
                  {game.winnerTeam?.name ?? (game.status === "CANCELLED" ? "Cancelled" : "Draw")}
                  {game.completionReason ? ` · ${game.completionReason}` : ""}
                </p>
                <Button asChild className="mt-auto w-full">
                  <Link href={civilizationRoutes.historyDetails(game.id)}>
                    <MapIcon className="size-4" /> Inspect final state
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <span className="text-[10px] text-muted-foreground">
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={page <= 1}
          aria-label="Previous history page"
          onClick={() => setPage((current) => current - 1)}
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          disabled={page >= totalPages}
          aria-label="Next history page"
          onClick={() => setPage((current) => current + 1)}
        >
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>
    </section>
  );
}
