"use client";

import { useEffect, useRef, useState } from "react";
import { CoinsIcon, CrownIcon, MedalIcon, SkullIcon, SwordsIcon, TrophyIcon } from "lucide-react";
import { toast } from "sonner";

import {
  useAttackBossMutation,
  useBossLeaderboardQuery,
  useClaimBossRewardMutation,
  useCurrentBossBattleQuery,
} from "@/features/boss-battle/api";
import type {
  BossBattle,
  BossLeaderboardEntry,
  BossReward,
} from "@/features/boss-battle/model/boss-battle.types";
import { useClientAuthStore } from "@/features/auth/model/client-auth.store";
import { formatBalance, resolveAssetUrl } from "@/shared/lib/item-display";
import { cn } from "@/shared/lib/utils";
import { AttributeBadge, AvatarImage, GameScoreIcon, ItemDisplayCard } from "@/shared/ui";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { Skeleton } from "@/shared/ui/8bit/skeleton";

const attributeOrder = ["strength", "intelligence", "charisma", "endurance"] as const;
const statusLabels: Partial<Record<BossBattle["status"], string>> = {
  SCHEDULED: "Battle Scheduled",
  DEFEATED: "Boss Defeated",
  FINALIZING: "Finalizing Results",
  COMPLETED: "Battle Completed",
  EXPIRED: "Battle Expired",
  CANCELLED: "Battle Cancelled",
};

function formatDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (days > 0)
    return `${String(days).padStart(2, "0")}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  if (hours > 0) return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`;
  return `${String(minutes).padStart(2, "0")}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

function BattleTimers({ battle, onBoundary }: { battle: BossBattle; onBoundary: () => void }) {
  const [now, setNow] = useState(() => new Date(battle.serverTime).getTime());
  const boundaryRef = useRef<string | null>(null);
  useEffect(() => {
    const serverBase = new Date(battle.serverTime).getTime();
    const clientBase = Date.now();
    const updateNow = () => setNow(serverBase + Date.now() - clientBase);
    updateNow();
    const timer = window.setInterval(updateNow, 1000);
    return () => window.clearInterval(timer);
  }, [battle.serverTime]);
  const primaryAt = battle.status === "SCHEDULED" ? battle.startsAt : battle.endsAt;
  const primaryRemaining = new Date(primaryAt).getTime() - now;
  const cooldownRemaining = battle.nextAttackAt ? new Date(battle.nextAttackAt).getTime() - now : 0;
  useEffect(() => {
    const boundary =
      cooldownRemaining <= 0
        ? `cooldown:${battle.nextAttackAt}`
        : primaryRemaining <= 0
          ? `battle:${primaryAt}`
          : null;
    if (boundary && boundaryRef.current !== boundary) {
      boundaryRef.current = boundary;
      onBoundary();
    }
  }, [battle.nextAttackAt, cooldownRemaining, onBoundary, primaryAt, primaryRemaining]);
  return (
    <Card>
      <CardContent className="grid gap-3 py-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-muted-foreground">
            {battle.status === "SCHEDULED" ? "Battle starts in" : "Battle ends in"}
          </p>
          <p className="font-semibold tabular-nums">{formatDuration(primaryRemaining)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Next attack</p>
          <p className="font-semibold tabular-nums">
            {cooldownRemaining > 0
              ? `Available in ${formatDuration(cooldownRemaining)}`
              : "Attack is ready"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function RewardCard({ reward, place }: { reward: BossReward; place: number }) {
  const item = reward.itemTemplate
    ? {
        id: reward.itemTemplate.id,
        name: reward.itemTemplate.name,
        description: reward.itemTemplate.description,
        image_url: reward.itemTemplate.imageUrl,
        strength: reward.itemTemplate.strength,
        charisma: reward.itemTemplate.charisma,
        agility: reward.itemTemplate.agility,
        intelligence: reward.itemTemplate.intelligence,
        price: 0,
        rarity: reward.itemTemplate.rarity,
        slotType: reward.itemTemplate.slotType,
        durability: reward.itemTemplate.durability,
      }
    : null;
  const label =
    reward.placeFrom === reward.placeTo
      ? `${reward.placeFrom}${reward.placeFrom === 1 ? "st" : reward.placeFrom === 2 ? "nd" : reward.placeFrom === 3 ? "rd" : "th"} Place`
      : `${reward.placeFrom}th–${reward.placeTo}th Place`;
  return (
    <Card className={cn(place === 1 && "border-amber-400 shadow-[0_0_24px_rgba(245,158,11,.22)]")}>
      <CardHeader className="items-center pb-2 text-center">
        <CardTitle className="flex items-center gap-2">
          {place === 1 ? (
            <CrownIcon className="size-5 text-amber-500" />
          ) : (
            <MedalIcon className="size-5" />
          )}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {item ? (
          <ItemDisplayCard item={item} showPrice={false} className="mx-auto min-h-64 max-w-64" />
        ) : null}
        <div className="flex flex-wrap justify-center gap-2">
          {reward.goldAmount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1">
              <CoinsIcon className="size-4 text-amber-500" />
              {formatBalance(reward.goldAmount)}
            </span>
          ) : null}
          {reward.gameScoreAmount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full border px-3 py-1">
              <GameScoreIcon className="size-4" />
              {formatBalance(reward.gameScoreAmount)}
            </span>
          ) : null}
          {attributeOrder
            .filter((key) => reward[key] > 0)
            .map((key) => (
              <AttributeBadge key={key} attribute={key} value={reward[key]} className="w-20" />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Rewards({ rewards }: { rewards: BossReward[] }) {
  const top = [1, 2, 3].map((place) =>
    rewards.find((reward) => reward.placeFrom <= place && reward.placeTo >= place),
  );
  const additional = rewards.filter((reward) => reward.placeFrom > 3);
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-medium">
        <TrophyIcon className="size-5" />
        Rewards
      </h2>
      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="md:col-span-2 md:mx-auto md:w-[calc(50%-0.5rem)]">
          {top[0] ? <RewardCard reward={top[0]} place={1} /> : null}
        </div>
        {top[1] ? <RewardCard reward={top[1]} place={2} /> : null}
        {top[2] ? <RewardCard reward={top[2]} place={3} /> : null}
      </div>
      {additional.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {additional.map((reward) => (
            <RewardCard key={reward.id} reward={reward} place={reward.placeFrom} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LeaderRow({ entry, current }: { entry: BossLeaderboardEntry; current: boolean }) {
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border p-3",
        current && "border-primary bg-primary/10",
        entry.place === 1 && "shadow-[inset_4px_0_0_#f59e0b]",
        entry.place === 2 && "shadow-[inset_4px_0_0_#94a3b8]",
        entry.place === 3 && "shadow-[inset_4px_0_0_#b45309]",
      )}
    >
      <span className="font-semibold tabular-nums">#{entry.place}</span>
      <AvatarImage
        avatarUrl={entry.avatarUrl}
        alt={`${entry.username} avatar`}
        sizeClassName="h-9 w-9"
      />
      <span className="truncate font-medium">{entry.username}</span>
      <span className="text-right font-semibold tabular-nums">
        {formatBalance(entry.totalDamage)}
      </span>
    </div>
  );
}

function BossLeaderboard({ battleId }: { battleId: string }) {
  const [page, setPage] = useState(1);
  const query = useBossLeaderboardQuery(battleId, page);
  const userId = useClientAuthStore((state) => state.session?.user.id);
  if (query.isPending) return <Skeleton className="h-48 w-full" />;
  if (query.isError)
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-destructive">{query.error.message}</p>
          <Button className="mt-4" onClick={() => query.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  const ownIsListed = query.data.items.some((entry) => entry.userId === userId);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Leaderboard</h2>
      {query.data.items.length ? (
        query.data.items.map((entry) => (
          <LeaderRow key={entry.userId} entry={entry} current={entry.userId === userId} />
        ))
      ) : (
        <p className="text-sm text-muted-foreground">No attacks have been made yet.</p>
      )}
      {query.data.own && !ownIsListed ? (
        <>
          <p className="pt-2 text-sm font-medium">Your Position</p>
          <LeaderRow entry={query.data.own} current />
        </>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={page === 1}
          onClick={() => setPage((value) => value - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={page * query.data.limit >= query.data.total}
          onClick={() => setPage((value) => value + 1)}
        >
          Next
        </Button>
      </div>
    </section>
  );
}

export function BossBattlePage() {
  const query = useCurrentBossBattleQuery();
  const battle = query.data;
  const attack = useAttackBossMutation(battle?.id);
  const claim = useClaimBossRewardMutation(battle?.id);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  if (query.isPending)
    return (
      <section className="space-y-4" aria-label="Loading boss battle">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="aspect-[16/7] w-full" />
      </section>
    );
  if (query.isError)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to Load Boss Battle</CardTitle>
          <CardDescription>{query.error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => query.refetch()}>Retry</Button>
        </CardContent>
      </Card>
    );
  if (!battle)
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Boss Battle</h1>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <SkullIcon className="size-10 text-muted-foreground" />
            <p className="font-semibold">No active boss battle</p>
            <p className="text-sm text-muted-foreground">
              Check back later for the next challenge.
            </p>
          </CardContent>
        </Card>
      </section>
    );
  const active = battle.status === "ACTIVE" && battle.currentHp > 0;
  const cooldownReady =
    !battle.nextAttackAt ||
    new Date(battle.nextAttackAt).getTime() <= new Date(battle.serverTime).getTime();
  const canAttack = active && battle.canAttack && cooldownReady && !attack.isPending;
  const hpPercent =
    battle.initialHp > 0
      ? Math.max(0, Math.min(100, (battle.currentHp / battle.initialHp) * 100))
      : 0;
  const claimStatus = battle.participant?.rewardClaimStatus;
  const canClaim =
    battle.status === "COMPLETED" &&
    battle.resultsFinalizedAt &&
    battle.rewardsEnabled &&
    claimStatus === "AVAILABLE";
  return (
    <section className="mx-auto max-w-5xl space-y-6 overflow-hidden">
      <h1 className="flex items-center gap-2 text-2xl font-semibold">
        <SkullIcon className="size-6" />
        Boss Battle
      </h1>
      <BattleTimers battle={battle} onBoundary={() => void query.refetch()} />
      <div className="overflow-hidden rounded-2xl border bg-muted">
        {battle.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- API-hosted images are not restricted to configured Next.js hosts.
          <img
            src={resolveAssetUrl(battle.imageUrl)}
            alt={battle.name}
            className="max-h-[32rem] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[16/7] items-center justify-center">
            <SkullIcon className="size-16 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xl font-semibold">{battle.name}</h2>
          {statusLabels[battle.status] ? (
            <span className="rounded-full border px-3 py-1 text-sm font-semibold">
              {statusLabels[battle.status]}
            </span>
          ) : null}
        </div>
        <div>
          <div className="mb-2 flex justify-between gap-2 text-sm font-semibold">
            <span>
              {formatBalance(battle.currentHp)} / {formatBalance(battle.initialHp)} HP
            </span>
            {battle.currentHp === 0 ? <span className="text-amber-500">Boss Defeated</span> : null}
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-red-500 transition-[width]"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {attributeOrder.map((key) => (
            <AttributeBadge key={key} attribute={key} value={battle[key]} />
          ))}
        </div>
        {battle.description ? (
          <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
            {battle.description}
          </p>
        ) : null}
      </div>
      <div className="space-y-3">
        <Button
          className="w-full sm:w-auto"
          disabled={!canAttack}
          onClick={async () => {
            try {
              const result = await attack.mutateAsync();
              setLastDamage(result.appliedDamage);
              toast.success(`You dealt ${formatBalance(result.appliedDamage)} damage`);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Unable to attack the boss.");
            }
          }}
        >
          <SwordsIcon className="size-4" />
          {attack.isPending ? "Attacking..." : "Attack Boss"}
        </Button>
        {lastDamage !== null ? (
          <div className="rounded-lg border border-red-400/50 bg-red-500/10 p-4 font-semibold">
            You dealt {formatBalance(lastDamage)} damage
          </div>
        ) : null}
        {canClaim ? (
          <Button
            disabled={claim.isPending}
            onClick={async () => {
              try {
                await claim.mutateAsync();
                toast.success("Reward claimed");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Unable to claim the reward.");
              }
            }}
          >
            {claim.isPending ? "Claiming..." : "Claim Reward"}
          </Button>
        ) : claimStatus === "CLAIMED" ? (
          <p className="font-semibold text-emerald-500">Reward Claimed</p>
        ) : battle.status === "EXPIRED" ? (
          <p className="text-sm text-muted-foreground">
            Rewards are unavailable because the boss was not defeated.
          </p>
        ) : null}
      </div>
      <Rewards rewards={battle.rewards} />
      <BossLeaderboard battleId={battle.id} />
    </section>
  );
}
