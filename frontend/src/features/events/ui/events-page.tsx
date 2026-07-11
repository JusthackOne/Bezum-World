"use client";

import Link from "next/link";
import { ActivityIcon, ChevronLeftIcon, ChevronRightIcon, CoinsIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { useEventsQuery } from "@/features/events/api";
import type {
  BattleGameEvent,
  EventFilter,
  EventUser,
  GameEvent,
} from "@/features/events/model/events.types";
import { publicUserRoutes } from "@/features/public-user/routes";
import { formatBalance } from "@/shared/lib/item-display";
import { cn } from "@/shared/lib/utils";
import { AvatarImage } from "@/shared/ui/avatar-image";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { GameScoreIcon, ItemDisplayCard } from "@/shared/ui";

const filterOptions: ReadonlyArray<{ value: EventFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "battles", label: "Battles" },
  { value: "purchases", label: "Purchases" },
];

function formatEventDate(value: string): string {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}-${month} ${hours}:${minutes}`;
}

function UserLink({ user }: { user: EventUser }) {
  return (
    <Link
      href={publicUserRoutes.profile(user.username)}
      className="inline-flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 font-semibold transition-colors hover:bg-muted/40"
    >
      <AvatarImage
        avatarUrl={user.avatar}
        alt={`${user.username} avatar`}
        sizeClassName="h-9 w-9"
      />
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{user.username}</span>
    </Link>
  );
}

function BattleRewards({ event }: { event: BattleGameEvent }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1 rounded-full border bg-background/85 px-2 py-1 font-semibold">
        <GameScoreIcon className="size-4" />+{formatBalance(event.gameScoreReward)} Game Score
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border bg-background/85 px-2 py-1 font-semibold">
        <CoinsIcon className="size-4 text-amber-500" />+{formatBalance(event.goldReward)} Gold
      </span>
    </span>
  );
}

function PurchaseEventRow({ event }: { event: Extract<GameEvent, { type: "PURCHASE" }> }) {
  return (
    <article className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-[110px_minmax(0,1fr)]">
      <time className="font-mono text-sm text-muted-foreground">
        {formatEventDate(event.created_at)}
      </time>
      <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_180px] lg:items-center">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <UserLink user={event.user} />
          <span className="text-muted-foreground">purchased</span>
          <span className="font-semibold">{event.item.name}</span>
        </div>
        <ItemDisplayCard
          item={event.item}
          showPrice={false}
          isShopCard={false}
          className="min-h-52 cursor-default rounded-lg"
        />
      </div>
    </article>
  );
}

function BattleEventRow({ event }: { event: Extract<GameEvent, { type: "BATTLE" }> }) {
  const resultClassName =
    event.result === "WIN"
      ? "border-emerald-400/60 bg-emerald-500/12 text-emerald-600"
      : "border-red-400/60 bg-red-500/12 text-red-600";

  return (
    <article className="grid gap-3 rounded-lg border bg-card p-3 md:grid-cols-[110px_minmax(0,1fr)]">
      <time className="font-mono text-sm text-muted-foreground">
        {formatEventDate(event.created_at)}
      </time>
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
        <UserLink user={event.challenger} />
        <span className={cn("rounded-full border px-2 py-1 text-xs font-bold", resultClassName)}>
          {event.result}
        </span>
        <UserLink user={event.opponent} />
        {event.result === "WIN" ? (
          <BattleRewards event={event} />
        ) : (
          <span className="inline-flex min-w-0 flex-wrap items-center gap-2 text-muted-foreground">
            <span>Winner received</span>
            <BattleRewards event={event} />
          </span>
        )}
      </div>
    </article>
  );
}

function EventRow({ event }: { event: GameEvent }) {
  if (event.type === "PURCHASE") {
    return <PurchaseEventRow event={event} />;
  }

  return <BattleEventRow event={event} />;
}

export function EventsPage() {
  const [selectedFilter, setSelectedFilter] = useState<EventFilter>("all");
  const [page, setPage] = useState(1);
  const eventsQuery = useEventsQuery({ type: selectedFilter, page });

  const events = useMemo(() => eventsQuery.data?.events ?? [], [eventsQuery.data?.events]);
  const pagination = eventsQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  function handleFilterChange(nextFilter: EventFilter) {
    setSelectedFilter(nextFilter);
    setPage(1);
  }

  if (eventsQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Failed to Load Events</CardTitle>
          <CardDescription>
            {eventsQuery.error instanceof Error ? eventsQuery.error.message : "Unexpected error"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => eventsQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ActivityIcon className="size-5 text-emerald-500" />
          <h1 className="text-2xl font-semibold">Events</h1>
        </div>
        <p className="text-muted-foreground text-sm">Latest purchases and completed battles.</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Activity Feed</CardTitle>
              <CardDescription>
                {eventsQuery.isPending
                  ? "Loading latest game events..."
                  : `${pagination?.total ?? 0} event${pagination?.total === 1 ? "" : "s"}`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={selectedFilter === option.value ? "default" : "outline"}
                  onClick={() => handleFilterChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {eventsQuery.isPending ? (
            <p className="text-muted-foreground text-sm">Loading events...</p>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground text-sm">No events found.</p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pagination?.page ?? page} of {Math.max(totalPages, 1)}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || eventsQuery.isFetching}
                onClick={() => setPage((previousPage) => Math.max(1, previousPage - 1))}
              >
                <ChevronLeftIcon className="size-4" />
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages || eventsQuery.isFetching}
                onClick={() => setPage((previousPage) => previousPage + 1)}
              >
                Next
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
