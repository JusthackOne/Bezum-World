"use client";

import Link from "next/link";
import { CoinsIcon, MedalIcon, TrophyIcon } from "lucide-react";
import { useState } from "react";

import { useSlotsLeaderboardQuery } from "@/features/slots/api";
import type { SlotLeaderboardEntry, SlotLeaderboardType } from "@/features/slots/model";
import { publicUserRoutes } from "@/features/public-user/routes";
import { formatBalance } from "@/shared/lib/item-display";
import { cn } from "@/shared/lib/utils";
import { AvatarImage } from "@/shared/ui/avatar-image";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

const podiumClasses = ["text-amber-300", "text-slate-300", "text-orange-400"] as const;

function RankBadge({ rank }: { rank: number }) {
  if (rank > 3) {
    return null;
  }

  const Icon = rank === 1 ? TrophyIcon : MedalIcon;

  return (
    <span
      title={`Place ${rank}`}
      className={cn(
        "absolute -top-1 -right-1 z-10 flex size-5 items-center justify-center rounded-full border border-white/15 bg-[#15172d] shadow-md",
        podiumClasses[rank - 1],
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      <span className="sr-only">Place {rank}</span>
    </span>
  );
}

function LeaderRow({ leader, type }: { leader: SlotLeaderboardEntry; type: SlotLeaderboardType }) {
  const value = type === "winnings" ? leader.totalWinnings : leader.totalLosses;

  return (
    <TableRow className="relative border-white/10 hover:bg-white/5">
      <TableCell className="min-w-0 py-2.5">
        <Link
          href={publicUserRoutes.profile(leader.username)}
          aria-label={`Open ${leader.username}'s profile`}
          className="absolute inset-0 z-10 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        />
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative shrink-0">
            <AvatarImage
              avatarUrl={leader.avatar}
              alt={`${leader.username} avatar`}
              sizeClassName="size-9"
              className="border-white/15 bg-white/5"
            />
            <RankBadge rank={leader.rank} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-bold text-slate-100">{leader.username}</p>
            <p className="mt-0.5 text-[9px] text-slate-500">#{leader.rank}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="py-2.5 text-right">
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-black tabular-nums",
            type === "winnings" ? "text-amber-200" : "text-rose-300",
          )}
        >
          <CoinsIcon className="size-3" />
          {formatBalance(value)}
        </span>
      </TableCell>
    </TableRow>
  );
}

export function SlotLeaderboard() {
  const [type, setType] = useState<SlotLeaderboardType>("winnings");
  const leaderboardQuery = useSlotsLeaderboardQuery(type);

  const leaders = leaderboardQuery.data?.leaders ?? [];
  const valueLabel = type === "winnings" ? "WON" : "LOST";

  return (
    <aside className="order-2 min-w-0 rounded-2xl border border-violet-400/20 bg-[#090b20]/95 p-3 shadow-[0_0_50px_rgba(15,23,42,.55)] sm:p-4 xl:order-none">
      <div className="mb-3">
        <div className="min-w-0">
          <p className="text-[9px] tracking-[0.22em] text-violet-300">SLOTS RANKING</p>
          <h2 className="mt-1.5 truncate text-sm font-black tracking-[0.1em] text-white">
            LEADERBOARD
          </h2>
        </div>
      </div>

      <div
        className="mb-3 grid grid-cols-2 rounded-lg border border-white/10 bg-black/20 p-1"
        role="tablist"
      >
        {(["winnings", "losses"] as const).map((tabType) => (
          <Button
            key={tabType}
            type="button"
            variant="ghost"
            size="sm"
            role="tab"
            aria-selected={type === tabType}
            onClick={() => setType(tabType)}
            className={cn(
              "h-7 px-2 text-[9px] tracking-wider text-slate-500 hover:bg-white/5 hover:text-slate-200",
              type === tabType &&
                (tabType === "winnings"
                  ? "bg-amber-400/10 text-amber-200"
                  : "bg-rose-400/10 text-rose-300"),
            )}
          >
            {tabType === "winnings" ? "TOP WINS" : "TOP LOSSES"}
          </Button>
        ))}
      </div>

      {leaderboardQuery.isPending ? (
        <p className="py-8 text-center text-[10px] text-slate-500">Loading ranking...</p>
      ) : leaderboardQuery.isError ? (
        <div className="py-6 text-center">
          <p className="text-[10px] leading-5 text-rose-300">Unable to load the ranking.</p>
          <Button
            type="button"
            variant="outline"
            size="xs"
            onClick={() => void leaderboardQuery.refetch()}
            className="mt-2 border-white/10 bg-transparent text-slate-200 hover:bg-white/5"
          >
            Retry
          </Button>
        </div>
      ) : leaders.length === 0 ? (
        <p className="py-8 text-center text-[10px] text-slate-500">No players yet.</p>
      ) : (
        <div className="max-h-208 overflow-y-auto pr-1">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="border-white/10 bg-transparent hover:bg-transparent">
                <TableHead className="h-7 text-[8px] tracking-wider text-slate-500">
                  PLAYER
                </TableHead>
                <TableHead className="h-7 w-20 text-right text-[8px] tracking-wider text-slate-500">
                  {valueLabel}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaders.map((leader) => (
                <LeaderRow key={leader.userId} leader={leader} type={type} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </aside>
  );
}
