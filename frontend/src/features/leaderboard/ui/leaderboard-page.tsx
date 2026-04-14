"use client";

import Link from "next/link";
import { CrownIcon, MedalIcon, UserCircle2Icon } from "lucide-react";
import { useMemo, useState } from "react";

import { useLeaderboardQuery } from "@/features/leaderboard/api";
import type {
  LeaderboardLeader,
  LeaderboardPeriod,
} from "@/features/leaderboard/model/leaderboard.types";
import { publicUserRoutes } from "@/features/public-user/routes";
import { formatBalance, resolveAssetUrl } from "@/shared/lib/item-display";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { GameScoreIcon } from "@/shared/ui";

const periodFilters: Array<{ label: string; value: LeaderboardPeriod }> = [
  { label: "All Time", value: "all" },
  { label: "Weekly", value: "weekly" },
  { label: "Daily", value: "daily" },
];

const podiumVisuals: Record<number, { cardClassName: string; badgeClassName: string }> = {
  1: {
    cardClassName: "border-yellow-300/90 bg-yellow-50/60 shadow-[0_12px_30px_rgba(202,138,4,0.18)]",
    badgeClassName: "bg-yellow-400 text-yellow-950",
  },
  2: {
    cardClassName: "border-slate-300/90 bg-slate-50/80 shadow-[0_10px_24px_rgba(100,116,139,0.14)]",
    badgeClassName: "bg-slate-300 text-slate-900",
  },
  3: {
    cardClassName: "border-amber-300/90 bg-amber-50/60 shadow-[0_10px_24px_rgba(180,83,9,0.15)]",
    badgeClassName: "bg-amber-500 text-amber-50",
  },
};

function getScoreLabel(period: LeaderboardPeriod): string {
  return period === "all" ? "Total GameScore" : "Gained GameScore";
}

function LeaderAvatar({
  avatar,
  username,
  sizeClassName,
}: {
  avatar: string | null;
  username: string;
  sizeClassName: string;
}) {
  if (!avatar) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full border bg-muted/30",
          sizeClassName,
        )}
      >
        <UserCircle2Icon className="size-2/3 text-muted-foreground/75" />
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-full border", sizeClassName)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={resolveAssetUrl(avatar)}
        alt={`${username} avatar`}
        className="h-full w-full object-cover"
      />
    </div>
  );
}

function TopLeaderCard({
  leader,
  place,
  period,
  emphasized,
}: {
  leader: LeaderboardLeader;
  place: 1 | 2 | 3;
  period: LeaderboardPeriod;
  emphasized: boolean;
}) {
  const visuals = podiumVisuals[place];
  const scoreLabel = getScoreLabel(period);

  return (
    <Link
      href={publicUserRoutes.profile(leader.username)}
      className={cn(
        "group relative block rounded-2xl border p-5 transition-transform duration-150 hover:-translate-y-1",
        visuals.cardClassName,
      )}
    >
      <span
        className={cn(
          "absolute left-3 top-3 inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-xs font-semibold",
          visuals.badgeClassName,
        )}
      >
        #{place}
      </span>

      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <LeaderAvatar
          avatar={leader.avatar}
          username={leader.username}
          sizeClassName={emphasized ? "h-24 w-24" : "h-20 w-20"}
        />
        <p className={cn("font-semibold break-all", emphasized ? "text-lg" : "text-base")}>
          {leader.username}
        </p>
        <div className="inline-flex items-center gap-1.5 rounded-full border bg-background/85 px-3 py-1.5 text-sm font-semibold">
          <GameScoreIcon className="size-4" />
          {formatBalance(leader.score)}
        </div>
        <p className="text-muted-foreground text-xs">{scoreLabel}</p>
      </div>
    </Link>
  );
}

function LeaderListRow({
  leader,
  period,
}: {
  leader: LeaderboardLeader;
  period: LeaderboardPeriod;
}) {
  const scoreLabel = getScoreLabel(period);

  return (
    <Link
      href={publicUserRoutes.profile(leader.username)}
      className="group grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-muted/30"
    >
      <span className="text-muted-foreground w-8 text-right text-sm font-semibold tabular-nums">
        #{leader.rank}
      </span>
      <LeaderAvatar avatar={leader.avatar} username={leader.username} sizeClassName="h-10 w-10" />
      <p className="text-sm font-medium break-all">{leader.username}</p>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums">{formatBalance(leader.score)}</p>
        <p className="text-muted-foreground text-[11px]">{scoreLabel}</p>
      </div>
    </Link>
  );
}

export function LeaderBoardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("all");
  const leaderboardQuery = useLeaderboardQuery(period);

  const leaders = useMemo(
    () => leaderboardQuery.data?.leaders ?? [],
    [leaderboardQuery.data?.leaders],
  );
  const first = leaders.find((leader) => leader.rank === 1);
  const second = leaders.find((leader) => leader.rank === 2);
  const third = leaders.find((leader) => leader.rank === 3);
  const remaining = leaders.filter((leader) => leader.rank > 3);

  if (leaderboardQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Failed to Load LeaderBoard</CardTitle>
          <CardDescription>
            {leaderboardQuery.error instanceof Error
              ? leaderboardQuery.error.message
              : "Unexpected error"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => leaderboardQuery.refetch()}>
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
          <CrownIcon className="size-5 text-amber-500" />
          <h1 className="text-2xl font-semibold">LeaderBoard</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Track top players by total score or recent score growth.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {periodFilters.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={period === option.value ? "default" : "outline"}
            onClick={() => setPeriod(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {leaderboardQuery.isPending ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-muted-foreground text-sm">Loading leaderboard...</p>
          </CardContent>
        </Card>
      ) : leaders.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <p className="text-muted-foreground text-sm">Leaderboard is empty for now.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Top 3 Players</CardTitle>
              <CardDescription>Best players for selected period.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid items-end gap-3 md:grid-cols-3">
                {second ? (
                  <TopLeaderCard leader={second} place={2} period={period} emphasized={false} />
                ) : (
                  <div />
                )}
                {first ? (
                  <TopLeaderCard leader={first} place={1} period={period} emphasized={true} />
                ) : (
                  <div />
                )}
                {third ? (
                  <TopLeaderCard leader={third} place={3} period={period} emphasized={false} />
                ) : (
                  <div />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <MedalIcon className="size-4" />
                Other Players
              </CardTitle>
              <CardDescription>Remaining ranked users.</CardDescription>
            </CardHeader>
            <CardContent>
              {remaining.length === 0 ? (
                <p className="text-muted-foreground text-sm">No additional players yet.</p>
              ) : (
                <div className="space-y-2">
                  {remaining.map((leader) => (
                    <LeaderListRow key={leader.userId} leader={leader} period={period} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}
