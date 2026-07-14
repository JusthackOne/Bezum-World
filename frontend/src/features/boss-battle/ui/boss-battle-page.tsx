"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  CheckCircle2Icon,
  CoinsIcon,
  CrownIcon,
  HelpCircleIcon,
  HistoryIcon,
  MedalIcon,
  SkullIcon,
  SwordsIcon,
  TrophyIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  useAttackBossMutation,
  useBossLeaderboardQuery,
  useBossBattleQuery,
  useClaimBossRewardMutation,
  useCurrentBossBattleQuery,
} from "@/features/boss-battle/api";
import {
  getBossBattleOutcomeLabel,
  isBossBattleFinal,
} from "@/features/boss-battle/model/boss-battle-outcome";
import { bossBattleRoutes } from "@/features/boss-battle/routes";
import type {
  BossBattle,
  BossClaimRewardResult,
  BossLeaderboardEntry,
  BossReward,
} from "@/features/boss-battle/model/boss-battle.types";
import { useClientAuthStore } from "@/features/auth/model/client-auth.store";
import { formatBalance, resolveAssetUrl } from "@/shared/lib/item-display";
import { cn } from "@/shared/lib/utils";
import { AttributeBadge, AvatarImage, GameScoreIcon, ItemDisplayCard } from "@/shared/ui";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/8bit/dialog";
import { Skeleton } from "@/shared/ui/8bit/skeleton";

const attributeOrder = ["strength", "intelligence", "charisma", "endurance"] as const;
const topPlaceStyles: Record<1 | 2 | 3, { container: string; badge: string }> = {
  1: {
    container:
      "border-amber-400/80 bg-amber-500/10 shadow-[inset_4px_0_0_#f59e0b,0_0_18px_rgba(245,158,11,.18)]",
    badge: "border-amber-400/70 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  2: {
    container:
      "border-slate-400/80 bg-slate-400/10 shadow-[inset_4px_0_0_#94a3b8,0_0_14px_rgba(148,163,184,.14)]",
    badge: "border-slate-400/70 bg-slate-400/15 text-slate-700 dark:text-slate-300",
  },
  3: {
    container:
      "border-orange-700/70 bg-orange-700/10 shadow-[inset_4px_0_0_#b45309,0_0_14px_rgba(180,83,9,.14)]",
    badge: "border-orange-700/60 bg-orange-700/15 text-orange-800 dark:text-orange-300",
  },
};

function getTopPlaceStyle(place: number) {
  return place === 1 || place === 2 || place === 3 ? topPlaceStyles[place] : null;
}

function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(seconds / 86400),
    h = Math.floor((seconds % 86400) / 3600),
    m = Math.floor((seconds % 3600) / 60),
    s = seconds % 60;
  if (d)
    return `${String(d).padStart(2, "0")}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  if (h) return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatOrdinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  const suffix = value % 10 === 1 ? "st" : value % 10 === 2 ? "nd" : value % 10 === 3 ? "rd" : "th";
  return `${value}${suffix}`;
}

function useServerNow(serverTime: string): number {
  const [initialClock] = useState(() => ({
    clientTime: Date.now(),
    serverTime: new Date(serverTime).getTime(),
  }));
  const offsetRef = useRef(initialClock.serverTime - initialClock.clientTime);
  const [now, setNow] = useState(initialClock.serverTime);
  useEffect(() => {
    offsetRef.current = new Date(serverTime).getTime() - Date.now();
    const initialUpdate = window.setTimeout(() => setNow(Date.now() + offsetRef.current), 0);
    const timer = window.setInterval(() => setNow(Date.now() + offsetRef.current), 1000);
    return () => {
      window.clearTimeout(initialUpdate);
      window.clearInterval(timer);
    };
  }, [serverTime]);
  return now;
}

function BossBattleHelpModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" aria-label="Open Boss Battle rules">
          <HelpCircleIcon className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent font="normal">
        <DialogHeader>
          <DialogTitle>Как работает Boss Battle</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2 text-left leading-6">
              <p>Атакуйте босса и наносите ему урон, пока битва не завершилась.</p>
              <p>
                Сила удара зависит от характеристик вашего персонажа. После атаки дождитесь
                восстановления следующего удара.
              </p>
              <p>
                Чем больше суммарного урона вы нанесёте, тем выше окажетесь в рейтинге. При
                одинаковом уроне игроки делят место и награду.
              </p>
              <p>
                Лучшие участники получают награды после победы над боссом. После завершения битвы
                награду нужно забрать самостоятельно.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Закрыть</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BattleTimer({ battle, onBoundary }: { battle: BossBattle; onBoundary: () => void }) {
  const now = useServerNow(battle.serverTime);
  const at = battle.status === "SCHEDULED" ? battle.startsAt : battle.endsAt;
  const remaining = new Date(at).getTime() - now;
  const fired = useRef<string | null>(null);
  useEffect(() => {
    if (remaining <= 0 && fired.current !== at) {
      fired.current = at;
      onBoundary();
    }
  }, [at, onBoundary, remaining]);
  return (
    <p className="mx-auto inline-flex max-w-full items-center gap-2 whitespace-nowrap rounded-lg border bg-card px-4 py-2 text-sm shadow-sm sm:mx-0">
      <span className="text-muted-foreground">
        {battle.status === "SCHEDULED" ? "Battle starts in" : "Battle ends in"}
      </span>
      <span className="font-semibold tabular-nums">{formatDuration(remaining)}</span>
    </p>
  );
}

function BattleNavigationStatus({
  battle,
  historical,
  onBoundary,
}: {
  battle: BossBattle;
  historical: boolean;
  onBoundary: () => void;
}) {
  const completedAt =
    battle.status === "DEFEATED" || battle.status === "FINALIZING" || battle.status === "COMPLETED"
      ? (battle.defeatedAt ?? battle.finishedAt ?? battle.endsAt)
      : (battle.finishedAt ?? battle.endsAt);
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Button asChild variant="outline" className="h-10 w-full px-4 sm:w-auto">
        <Link
          href={bossBattleRoutes.history}
          className="inline-flex items-center gap-2 whitespace-nowrap"
        >
          <HistoryIcon className="size-4 shrink-0" aria-hidden="true" />
          Battle History
        </Link>
      </Button>
      {historical && isBossBattleFinal(battle.status) ? (
        <p className="min-w-0 rounded-lg border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm sm:text-right">
          <span className="font-semibold text-foreground">
            {getBossBattleOutcomeLabel(battle.status)}
          </span>{" "}
          <span className="whitespace-normal sm:whitespace-nowrap">
            ·{" "}
            {new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeStyle: "short" }).format(
              new Date(completedAt),
            )}
          </span>
        </p>
      ) : (
        <BattleTimer battle={battle} onBoundary={onBoundary} />
      )}
    </div>
  );
}

function RewardResource({ type, value }: { type: "gold" | "gameScore"; value: number }) {
  const gold = type === "gold";
  return (
    <span
      className={cn(
        "inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1.5 shadow-sm",
        gold
          ? "border-amber-400/70 bg-[linear-gradient(120deg,rgba(250,204,21,0.13),rgba(251,191,36,0.08))]"
          : "border-fuchsia-400/60 bg-[linear-gradient(120deg,rgba(244,114,182,0.12),rgba(96,165,250,0.12),rgba(52,211,153,0.12),rgba(250,204,21,0.12))]",
      )}
    >
      {gold ? (
        <CoinsIcon className="size-4 shrink-0 text-amber-300" />
      ) : (
        <GameScoreIcon className="size-4 shrink-0 text-fuchsia-300" />
      )}
      <span
        className={cn(
          "min-w-0 truncate text-sm font-semibold tabular-nums",
          gold
            ? "bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-transparent"
            : "bg-gradient-to-r from-fuchsia-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent",
        )}
        title={String(value)}
      >
        {formatBalance(value)}
      </span>
    </span>
  );
}

function BossDamageIndicator({
  damage,
  defeated,
}: {
  damage: { id: string; value: number } | null;
  defeated: boolean;
}) {
  if (!damage && !defeated) return null;
  return createPortal(
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-black/25 animate-in fade-in duration-150 motion-reduce:animate-none"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        {damage ? (
          <span
            key={damage.id}
            className="boss-damage-indicator text-4xl font-black text-white sm:text-5xl"
          >
            -{formatBalance(damage.value)}
          </span>
        ) : null}
        {defeated ? (
          <span className="boss-damage-indicator rounded-lg border border-amber-300 bg-black/70 px-4 py-2 text-xl font-black text-amber-300 sm:text-2xl">
            You defeated the boss!
          </span>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

function BossHpBar({
  current,
  initial,
  trail,
}: {
  current: number;
  initial: number;
  trail: number;
}) {
  const currentPct = initial ? Math.max(0, Math.min(100, (current / initial) * 100)) : 0;
  const trailPct = initial ? Math.max(currentPct, Math.min(100, (trail / initial) * 100)) : 0;
  return (
    <div>
      <div className="mb-2 flex justify-between gap-2 text-sm font-semibold">
        <span>
          {formatBalance(current)} / {formatBalance(initial)} HP
        </span>
      </div>
      <div
        className="relative h-4 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Boss health"
        aria-valuemin={0}
        aria-valuemax={initial}
        aria-valuenow={current}
      >
        <div
          className="absolute inset-y-0 left-0 bg-white transition-[width] duration-700 motion-reduce:transition-none"
          style={{ width: `${trailPct}%` }}
        />
        <div className="absolute inset-y-0 left-0 bg-red-500" style={{ width: `${currentPct}%` }} />
      </div>
    </div>
  );
}

function disabledLabel(b: BossBattle): string {
  if (
    b.currentHp <= 0 ||
    b.status === "DEFEATED" ||
    b.status === "FINALIZING" ||
    b.status === "COMPLETED"
  )
    return "Boss Defeated";
  if (b.status === "SCHEDULED") return "Battle Has Not Started";
  if (b.status === "EXPIRED" || b.status === "CANCELLED") return "Battle Has Ended";
  return "Attack Unavailable";
}
function BossAttackControl({
  battle,
  pending,
  onAttack,
  onBoundary,
}: {
  battle: BossBattle;
  pending: boolean;
  onAttack: () => void;
  onBoundary: () => void;
}) {
  const now = useServerNow(battle.serverTime);
  const cooldown = battle.nextAttackAt ? new Date(battle.nextAttackAt).getTime() - now : 0;
  const active = battle.status === "ACTIVE" && battle.currentHp > 0;
  const fired = useRef<string | null>(null);
  useEffect(() => {
    if (active && battle.nextAttackAt && cooldown <= 0 && fired.current !== battle.nextAttackAt) {
      fired.current = battle.nextAttackAt;
      onBoundary();
    }
  }, [active, battle.nextAttackAt, cooldown, onBoundary]);
  const ready = active && battle.canAttack && cooldown <= 0;
  return (
    <div className="flex justify-center py-3">
      <Button
        className="min-h-14 w-full flex-col sm:min-h-20 sm:max-w-md sm:text-lg"
        size="lg"
        disabled={!ready || pending}
        onClick={onAttack}
        aria-label={cooldown > 0 ? "Attack unavailable during cooldown" : undefined}
      >
        {pending ? (
          <span>Attacking...</span>
        ) : !active ? (
          <span>{disabledLabel(battle)}</span>
        ) : cooldown > 0 ? (
          <>
            <span>Next attack in</span>
            <span className="tabular-nums" aria-hidden="true">
              {formatDuration(cooldown)}
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-2">
              <SwordsIcon className="size-5" />
              Attack Boss
            </span>
            {battle.damageRange ? (
              <span className="text-xs opacity-80">
                {formatBalance(battle.damageRange.min)}–{formatBalance(battle.damageRange.max)}{" "}
                damage
              </span>
            ) : null}
          </>
        )}
      </Button>
    </div>
  );
}

function RewardCard({ reward, place }: { reward: BossReward; place: number }) {
  const placeStyle = getTopPlaceStyle(place);
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
  const suffix =
    reward.placeFrom === 1
      ? "st"
      : reward.placeFrom === 2
        ? "nd"
        : reward.placeFrom === 3
          ? "rd"
          : "th";
  const label =
    reward.placeFrom === reward.placeTo
      ? `${reward.placeFrom}${suffix} Place`
      : `${reward.placeFrom}th–${reward.placeTo}th Place`;
  return (
    <Card
      className={cn("h-full rounded-lg", placeStyle?.container, place === 1 && "md:-translate-y-2")}
    >
      <CardHeader className="items-center p-3 pb-1 text-center">
        <CardTitle
          className={cn(
            "flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold",
            placeStyle?.badge,
          )}
        >
          {place === 1 ? (
            <CrownIcon className="size-5 text-amber-500" />
          ) : (
            <MedalIcon className="size-4" />
          )}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3">
        {item ? (
          <ItemDisplayCard item={item} showPrice={false} className="mx-auto min-h-44 max-w-48" />
        ) : null}
        <div className="flex flex-wrap justify-center gap-1.5">
          {reward.goldAmount > 0 ? <RewardResource type="gold" value={reward.goldAmount} /> : null}
          {reward.gameScoreAmount > 0 ? (
            <RewardResource type="gameScore" value={reward.gameScoreAmount} />
          ) : null}
          {attributeOrder
            .filter((k) => reward[k] > 0)
            .map((k) => (
              <AttributeBadge key={k} attribute={k} value={reward[k]} className="w-20" />
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
function Rewards({ rewards }: { rewards: BossReward[] }) {
  const top = [1, 2, 3].map((p) => rewards.find((r) => r.placeFrom <= p && r.placeTo >= p));
  const extra = rewards.filter((r) => r.placeFrom > 3);
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-medium">
        <TrophyIcon className="size-5" />
        Rewards
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        {top[0] ? (
          <div className="order-1 md:order-2">
            <RewardCard reward={top[0]} place={1} />
          </div>
        ) : null}
        {top[1] ? (
          <div className="order-2 md:order-1">
            <RewardCard reward={top[1]} place={2} />
          </div>
        ) : null}
        {top[2] ? (
          <div className="order-3">
            <RewardCard reward={top[2]} place={3} />
          </div>
        ) : null}
      </div>
      {extra.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {extra.map((r) => (
            <RewardCard key={r.id} reward={r} place={r.placeFrom} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function RewardReceivedModal({
  reward,
  onClose,
}: {
  reward: BossClaimRewardResult | null;
  onClose: () => void;
}) {
  const item = reward?.item
    ? {
        id: reward.item.id,
        name: reward.item.name,
        description: reward.item.description,
        image_url: reward.item.imageUrl,
        strength: reward.item.strength,
        charisma: reward.item.charisma,
        agility: reward.item.agility,
        intelligence: reward.item.intelligence,
        price: 0,
        rarity: reward.item.rarity,
        slotType: reward.item.slotType,
        durability: reward.item.durability,
      }
    : null;
  return (
    <Dialog open={Boolean(reward)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent font="normal">
        <DialogHeader>
          <DialogTitle>Reward Received</DialogTitle>
          <DialogDescription>You received:</DialogDescription>
        </DialogHeader>
        {reward ? (
          <div className="space-y-4">
            {item ? (
              <div className="space-y-2 text-center">
                <ItemDisplayCard item={item} showPrice={false} className="mx-auto max-w-52" />
                <p className="text-sm text-muted-foreground">Item added to inventory</p>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-center gap-2">
              {reward.gold > 0 ? <RewardResource type="gold" value={reward.gold} /> : null}
              {reward.gameScore > 0 ? (
                <RewardResource type="gameScore" value={reward.gameScore} />
              ) : null}
              {attributeOrder
                .filter((key) => reward.attributes[key] > 0)
                .map((key) => (
                  <AttributeBadge
                    key={key}
                    attribute={key}
                    value={reward.attributes[key]}
                    className="w-20"
                  />
                ))}
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LeaderRow({ entry, current }: { entry: BossLeaderboardEntry; current: boolean }) {
  const placeStyle = getTopPlaceStyle(entry.place);
  return (
    <div
      className={cn(
        "grid min-w-0 grid-cols-[2.5rem_auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border p-3",
        placeStyle?.container,
        current && "border-primary bg-primary/10",
      )}
    >
      <span
        className={cn(
          "rounded-full border px-2 py-1 text-center text-xs font-semibold",
          placeStyle?.badge,
        )}
      >
        #{entry.place}
      </span>
      <AvatarImage
        avatarUrl={entry.avatarUrl}
        alt={`${entry.username} avatar`}
        sizeClassName="h-9 w-9"
      />
      <span className="truncate font-medium">{entry.username}</span>
      <span className="font-semibold tabular-nums">{formatBalance(entry.totalDamage)}</span>
    </div>
  );
}
function BossLeaderboard({ battleId }: { battleId: string }) {
  const q = useBossLeaderboardQuery(battleId);
  const userId = useClientAuthStore((s) => s.session?.user.id);
  if (q.isPending) return <Skeleton className="h-48 w-full" />;
  if (q.isError)
    return (
      <Card>
        <CardContent className="py-6 text-destructive">
          {q.error.message}
          <Button className="mt-4" onClick={() => q.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  const ownListed = q.data.items.some((e) => e.userId === userId);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Leaderboard</h2>
      {q.data.items.length ? (
        q.data.items.map((e) => (
          <LeaderRow key={e.userId} entry={e} current={e.userId === userId} />
        ))
      ) : (
        <p className="text-sm text-muted-foreground">No attacks have been made yet.</p>
      )}
      {q.data.own && !ownListed ? (
        <>
          <p className="pt-2 text-sm font-medium">Your Position</p>
          <LeaderRow entry={q.data.own} current />
        </>
      ) : null}
    </section>
  );
}

export function BossBattlePage({ battleId }: { battleId?: string } = {}) {
  const currentQuery = useCurrentBossBattleQuery();
  const detailQuery = useBossBattleQuery(battleId);
  const query = battleId ? detailQuery : currentQuery,
    battle = query.data;
  const refetchBattle = query.refetch;
  const attack = useAttackBossMutation(battle?.id),
    claim = useClaimBossRewardMutation(battle?.id);
  const [damage, setDamage] = useState<{ id: string; value: number } | null>(null);
  const [localHp, setLocalHp] = useState<number | null>(null);
  const [trailHp, setTrailHp] = useState<number | null>(null);
  const [claimedReward, setClaimedReward] = useState<BossClaimRewardResult | null>(null);
  const [showDefeatEffect, setShowDefeatEffect] = useState(false);
  const setSession = useClientAuthStore((state) => state.setSession);
  const session = useClientAuthStore((state) => state.session);
  const damageTimer = useRef<number | null>(null),
    trailTimer = useRef<number | null>(null),
    defeatTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (damageTimer.current) clearTimeout(damageTimer.current);
      if (trailTimer.current) clearTimeout(trailTimer.current);
      if (defeatTimer.current) clearTimeout(defeatTimer.current);
    },
    [],
  );
  useEffect(() => {
    if (battle?.status !== "DEFEATED" && battle?.status !== "FINALIZING") return;
    const timer = window.setInterval(() => void refetchBattle(), 1500);
    return () => window.clearInterval(timer);
  }, [battle?.status, refetchBattle]);
  if (query.isPending)
    return (
      <section className="space-y-4">
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
        <div className="flex w-full items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Boss Battle</h1>
          <BossBattleHelpModal />
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <SkullIcon className="size-10" />
            <p className="font-semibold">No active boss battle</p>
          </CardContent>
        </Card>
        <Button asChild variant="outline" className="h-10 w-full px-4 sm:w-auto">
          <Link
            href={bossBattleRoutes.history}
            className="inline-flex items-center gap-2 whitespace-nowrap"
          >
            <HistoryIcon className="size-4 shrink-0" aria-hidden="true" />
            Battle History
          </Link>
        </Button>
      </section>
    );
  const hp = localHp ?? battle.currentHp,
    trail = trailHp ?? hp,
    claimStatus = battle.participant?.rewardClaimStatus;
  const canClaim =
    isBossBattleFinal(battle.status) &&
    Boolean(battle.resultsFinalizedAt) &&
    battle.rewardsEnabled &&
    claimStatus === "AVAILABLE";
  const doAttack = async () => {
    try {
      const previous = hp;
      const result = await attack.mutateAsync();
      setLocalHp(result.currentHp);
      setTrailHp(previous);
      setDamage({ id: `${Date.now()}-${result.appliedDamage}`, value: result.appliedDamage });
      if (damageTimer.current) clearTimeout(damageTimer.current);
      damageTimer.current = window.setTimeout(() => setDamage(null), 800);
      if (trailTimer.current) clearTimeout(trailTimer.current);
      trailTimer.current = window.setTimeout(() => setTrailHp(result.currentHp), 180);
      if (result.bossDefeated) {
        setShowDefeatEffect(true);
        defeatTimer.current = window.setTimeout(() => setShowDefeatEffect(false), 1600);
        await refetchBattle();
      }
    } catch (error) {
      setLocalHp(null);
      setTrailHp(null);
      toast.error(error instanceof Error ? error.message : "Unable to attack the boss.");
      void refetchBattle();
    }
  };
  return (
    <section className="mx-auto max-w-5xl space-y-6 overflow-hidden">
      <div className="flex w-full items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <SkullIcon className="size-6" />
          Boss Battle
        </h1>
        <BossBattleHelpModal />
      </div>
      <BattleNavigationStatus
        battle={battle}
        historical={isBossBattleFinal(battle.status)}
        onBoundary={() => void query.refetch()}
      />
      <div className="relative overflow-hidden rounded-2xl border">
        {battle.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- API-hosted images are not restricted to configured Next.js hosts.
          <img
            src={resolveAssetUrl(battle.imageUrl)}
            alt={battle.name}
            className="max-h-[32rem] w-full object-contain"
          />
        ) : (
          <div className="flex aspect-[16/7] items-center justify-center">
            <SkullIcon className="size-16" />
          </div>
        )}
        <BossDamageIndicator damage={damage} defeated={showDefeatEffect} />
      </div>
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">{battle.name}</h2>
        <BossHpBar current={hp} initial={battle.initialHp} trail={trail} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {attributeOrder.map((k) => (
            <AttributeBadge key={k} attribute={k} value={battle[k]} />
          ))}
        </div>
        {canClaim ? (
          <div className="flex justify-center py-2">
            <Button
              className="h-auto min-h-12 w-full max-w-md whitespace-normal border border-amber-300/70 bg-gradient-to-r from-amber-500 to-yellow-500 px-4 py-3 text-center font-semibold leading-tight text-amber-950 shadow-[0_0_24px_rgba(245,158,11,0.3)] hover:from-amber-400 hover:to-yellow-400 sm:px-5"
              disabled={claim.isPending}
              onClick={async () => {
                try {
                  const reward = await claim.mutateAsync();
                  if (session) {
                    setSession({
                      ...session,
                      user: {
                        ...session.user,
                        balance: session.user.balance + reward.gold,
                        gameScore: session.user.gameScore + reward.gameScore,
                        strength: session.user.strength + reward.attributes.strength,
                        charisma: session.user.charisma + reward.attributes.charisma,
                        endurance: session.user.endurance + reward.attributes.endurance,
                        intelligence: session.user.intelligence + reward.attributes.intelligence,
                      },
                    });
                  }
                  setClaimedReward(reward);
                  toast.success("Reward claimed");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Unable to claim the reward.");
                }
              }}
            >
              <TrophyIcon className="size-5 shrink-0" />
              {claim.isPending
                ? "Claiming..."
                : battle.participant?.place
                  ? `Claim Reward for ${formatOrdinal(battle.participant.place)} Place`
                  : "Claim Reward"}
            </Button>
          </div>
        ) : claimStatus === "CLAIMED" ? (
          <div className="flex justify-center py-2">
            <div className="inline-flex max-w-full items-center gap-3 rounded-xl border border-emerald-400/60 bg-emerald-500/10 px-5 py-3 text-emerald-700 shadow-[0_0_20px_rgba(16,185,129,0.16)] dark:text-emerald-300">
              <CheckCircle2Icon className="size-6 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Reward Claimed</p>
                {battle.participant?.place ? (
                  <p className="text-xs opacity-80">
                    {formatOrdinal(battle.participant.place)} Place reward received
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        {battle.description ? (
          <p className="whitespace-pre-line text-sm leading-6 text-muted-foreground">
            {battle.description}
          </p>
        ) : null}
      </div>
      {battle.status === "ACTIVE" ? (
        <BossAttackControl
          battle={battle}
          pending={attack.isPending}
          onAttack={() => void doAttack()}
          onBoundary={() => void query.refetch()}
        />
      ) : null}
      <BossLeaderboard battleId={battle.id} />
      <Rewards rewards={battle.rewards} />
      <RewardReceivedModal reward={claimedReward} onClose={() => setClaimedReward(null)} />
    </section>
  );
}
