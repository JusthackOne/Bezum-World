"use client";

import Link from "next/link";
import { ActivityIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import { CompactTaskCard } from "@/features/client-tasks/ui/compact-task-card";
import { useEventsQuery } from "@/features/events/api";
import type {
  BattleGameEvent,
  EventFilter,
  EventUser,
  GameEvent,
} from "@/features/events/model/events.types";
import { publicUserRoutes } from "@/features/public-user/routes";
import { cn } from "@/shared/lib/utils";
import { AvatarImage } from "@/shared/ui/avatar-image";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { ItemDisplayCard, RewardBadgesList, type RewardBadgeItem } from "@/shared/ui";

const filterOptions: ReadonlyArray<{ value: EventFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "battles", label: "Battles" },
  { value: "purchases", label: "Purchases" },
  { value: "tasks", label: "Tasks" },
];

function formatEventDate(value: string): string {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}-${month} ${hours}:${minutes}`;
}

const eventRowGridClassName =
  "grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-[88px_minmax(104px,0.8fr)_104px_minmax(160px,1.2fr)_minmax(160px,1fr)] md:items-center";

function EventDate({ value }: { value: string }) {
  return (
    <time className="flex h-full items-center justify-start font-mono text-sm text-muted-foreground md:justify-center">
      {formatEventDate(value)}
    </time>
  );
}

function ColumnTitle({ children }: { children: ReactNode }) {
  return (
    <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </p>
  );
}

function UserLink({ user }: { user: EventUser }) {
  return (
    <Link
      href={publicUserRoutes.profile(user.username)}
      className="mx-auto flex min-w-0 flex-col items-center gap-2 rounded-md px-2 py-1 text-center font-semibold transition-colors hover:bg-muted/40"
    >
      <AvatarImage
        avatarUrl={user.avatar}
        alt={`${user.username} avatar`}
        sizeClassName="h-14 w-14"
      />
      <span className="w-full min-w-0 text-sm leading-tight break-words [overflow-wrap:anywhere]">
        {user.username}
      </span>
    </Link>
  );
}

function BattleRewards({ event }: { event: BattleGameEvent }) {
  const rewards: RewardBadgeItem[] = [];

  if (event.gameScoreReward > 0) {
    rewards.push({ kind: "gameScore", value: event.gameScoreReward });
  }

  if (event.goldReward > 0) {
    rewards.push({ kind: "balance", value: event.goldReward });
  }

  return <RewardBadgesList rewards={rewards} emptyLabel="No reward" className="justify-center" />;
}

function PurchaseEventRow({ event }: { event: Extract<GameEvent, { type: "PURCHASE" }> }) {
  return (
    <article className={eventRowGridClassName}>
      <EventDate value={event.created_at} />
      <div className="min-w-0">
        <ColumnTitle>User</ColumnTitle>
        <UserLink user={event.user} />
      </div>
      <div className="flex items-center justify-center">
        <span className="rounded-full border bg-muted/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          purchased
        </span>
      </div>
      <div className="min-w-0 md:col-span-2">
        <ItemDisplayCard
          item={event.item}
          showPrice={false}
          isShopCard={false}
          className="mx-auto min-h-48 w-full max-w-64 cursor-default rounded-lg"
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
    <article className={eventRowGridClassName}>
      <EventDate value={event.created_at} />
      <div className="min-w-0">
        <ColumnTitle>Challenger</ColumnTitle>
        <UserLink user={event.challenger} />
      </div>
      <div className="flex items-center justify-center">
        <span className={cn("rounded-full border px-2 py-1 text-xs font-bold", resultClassName)}>
          {event.result}
        </span>
      </div>
      <div className="min-w-0">
        <ColumnTitle>Opponent</ColumnTitle>
        <UserLink user={event.opponent} />
      </div>
      <div className="min-w-0 space-y-2 text-center">
        <ColumnTitle>Winner Reward</ColumnTitle>
        <div className="flex justify-center">
          <BattleRewards event={event} />
        </div>
      </div>
    </article>
  );
}

function getTaskRewards(event: Extract<GameEvent, { type: "TASK_COMPLETED" }>): RewardBadgeItem[] {
  const rewards: RewardBadgeItem[] = [];

  if (event.task.rewardMoney > 0) {
    rewards.push({ kind: "balance", value: event.task.rewardMoney });
  }

  if ((event.task.rewardGameScore ?? 0) > 0) {
    rewards.push({ kind: "gameScore", value: event.task.rewardGameScore ?? 0 });
  }

  if ((event.task.rewardAttributes?.strength ?? 0) > 0) {
    rewards.push({ kind: "strength", value: event.task.rewardAttributes?.strength ?? 0 });
  }

  if ((event.task.rewardAttributes?.intelligence ?? 0) > 0) {
    rewards.push({ kind: "intelligence", value: event.task.rewardAttributes?.intelligence ?? 0 });
  }

  if ((event.task.rewardAttributes?.charisma ?? 0) > 0) {
    rewards.push({ kind: "charisma", value: event.task.rewardAttributes?.charisma ?? 0 });
  }

  if ((event.task.rewardAttributes?.endurance ?? 0) > 0) {
    rewards.push({ kind: "endurance", value: event.task.rewardAttributes?.endurance ?? 0 });
  }

  return rewards;
}

function TaskCompletedEventRow({
  event,
}: {
  event: Extract<GameEvent, { type: "TASK_COMPLETED" }>;
}) {
  return (
    <article className={eventRowGridClassName}>
      <EventDate value={event.created_at} />
      <div className="min-w-0">
        <ColumnTitle>User</ColumnTitle>
        <UserLink user={event.user} />
      </div>
      <div className="flex items-center justify-center">
        <span className="rounded-full border bg-muted/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          completed
        </span>
      </div>
      <div className="min-w-0">
        <CompactTaskCard
          task={{
            title: event.task.title,
            image: event.proofImage ?? event.task.image,
          }}
        />
      </div>
      <div className="min-w-0 space-y-2 text-center">
        <ColumnTitle>Reward</ColumnTitle>
        <RewardBadgesList
          rewards={getTaskRewards(event)}
          emptyLabel="No reward"
          className="justify-center"
        />
      </div>
    </article>
  );
}

function EventRow({ event }: { event: GameEvent }) {
  if (event.type === "PURCHASE") {
    return <PurchaseEventRow event={event} />;
  }

  if (event.type === "TASK_COMPLETED") {
    return <TaskCompletedEventRow event={event} />;
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
