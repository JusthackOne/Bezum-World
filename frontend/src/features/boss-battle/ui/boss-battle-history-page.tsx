"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { HistoryIcon, SkullIcon } from "lucide-react";
import { useBossBattleHistoryQuery } from "../api";
import { getBossBattleOutcomeLabel } from "../model/boss-battle-outcome";
import type { BossBattleHistoryItem } from "../model/boss-battle.types";
import { bossBattleRoutes } from "../routes";
import { publicUserRoutes } from "@/features/public-user/routes";
import { resolveAssetUrl } from "@/shared/lib/item-display";
import { AvatarImage } from "@/shared/ui";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { Skeleton } from "@/shared/ui/8bit/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function BossImage({ battle }: { battle: BossBattleHistoryItem }) {
  return battle.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- API-hosted images can use arbitrary hosts.
    <img
      className="size-11 rounded-md object-cover"
      src={resolveAssetUrl(battle.imageUrl)}
      alt=""
    />
  ) : (
    <span className="grid size-11 place-items-center rounded-md bg-muted">
      <SkullIcon className="size-5" />
    </span>
  );
}

function Winner({ winner }: { winner: BossBattleHistoryItem["winner"] }) {
  if (!winner) return <span className="text-muted-foreground">—</span>;

  return (
    <Link
      href={publicUserRoutes.profile(winner.username)}
      className="inline-flex max-w-full items-center gap-2 rounded-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      onClick={(event) => event.stopPropagation()}
    >
      <AvatarImage
        avatarUrl={winner.avatarUrl}
        alt={`${winner.username} avatar`}
        sizeClassName="size-8"
      />
      <span className="truncate">{winner.username}</span>
    </Link>
  );
}

function navigateFromRow(event: React.KeyboardEvent, href: string, push: (href: string) => void) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    push(href);
  }
}

export function BossBattleHistoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsedPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const query = useBossBattleHistoryQuery(page);

  if (query.isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (query.isError)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to Load Battle History</CardTitle>
          <CardDescription>{query.error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => query.refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );

  const items = query.data.items.filter((battle) => battle.status !== "DRAFT");
  const pages = Math.max(1, Math.ceil(query.data.total / query.data.limit));
  const changePage = (next: number) => router.push(`${bossBattleRoutes.history}?page=${next}`);
  return (
    <section className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <HistoryIcon className="size-6" />
          Boss Battle History
        </h1>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link href={bossBattleRoutes.current}>Current Battle</Link>
        </Button>
      </div>
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No boss battles found
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            className="hidden overflow-hidden rounded-lg border md:block"
            aria-busy={query.isFetching}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Boss</TableHead>
                  <TableHead className="w-40 min-w-40">Result</TableHead>
                  <TableHead>Battle period</TableHead>
                  <TableHead className="min-w-48">Winner</TableHead>
                  <TableHead>Ended</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((battle) => {
                  const href = bossBattleRoutes.details(battle.id);
                  return (
                    <TableRow
                      key={battle.id}
                      tabIndex={0}
                      role="link"
                      className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => router.push(href)}
                      onKeyDown={(event) => navigateFromRow(event, href, router.push)}
                    >
                      <TableCell className="w-40 min-w-40">
                        <div className="flex items-center gap-3">
                          <BossImage battle={battle} />
                          <span className="font-medium">{battle.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="whitespace-nowrap rounded-full border px-2 py-1 text-xs font-semibold">
                          {getBossBattleOutcomeLabel(battle.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="whitespace-nowrap">{formatDate(battle.startsAt)}</span>
                        <br />
                        <span className="whitespace-nowrap text-muted-foreground">
                          {formatDate(battle.endsAt)}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-48">
                        <Winner winner={battle.winner} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDate(battle.finishedAt ?? battle.endsAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 md:hidden">
            {items.map((battle) => {
              const href = bossBattleRoutes.details(battle.id);
              return (
                <div
                  key={battle.id}
                  role="link"
                  tabIndex={0}
                  className="rounded-lg border p-4 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => router.push(href)}
                  onKeyDown={(event) => navigateFromRow(event, href, router.push)}
                >
                  <div className="flex items-center gap-3">
                    <BossImage battle={battle} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{battle.name}</p>
                      <span className="text-xs text-muted-foreground">
                        {getBossBattleOutcomeLabel(battle.status)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <Winner winner={battle.winner} />
                    <time className="text-right text-xs text-muted-foreground">
                      {formatDate(battle.finishedAt ?? battle.endsAt)}
                    </time>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-3" aria-busy={query.isFetching}>
            <Button
              variant="outline"
              disabled={page <= 1 || query.isFetching}
              onClick={() => changePage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm tabular-nums">
              Page {page} of {pages}
            </span>
            <Button
              variant="outline"
              disabled={page >= pages || query.isFetching}
              onClick={() => changePage(page + 1)}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
