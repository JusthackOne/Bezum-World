"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  FootprintsIcon,
  HardHatIcon,
  PersonStandingIcon,
  ShieldIcon,
  ShirtIcon,
  SwordIcon,
  UserCircle2Icon,
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";

import { useClientAuthStore } from "@/features/auth/model/client-auth.store";
import { useBattlePlayersQuery, useStartBattleMutation } from "@/features/battles/api";
import type { BattlePlayer, BattlePlayerEquipment } from "@/features/battles/model/battles.types";
import { publicUserRoutes } from "@/features/public-user/routes";
import { queryKeys } from "@/shared/config/query-keys";
import { resolveAssetUrl } from "@/shared/lib/item-display";
import {
  AttributeBadge,
  ProfileItemSlot,
  RewardBadgesList,
  type RewardBadgeItem,
} from "@/shared/ui";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/shared/ui/8bit/toast";
import { TooltipProvider } from "@/shared/ui/8bit/tooltip";

type ToastVariant = "default" | "destructive";

interface ToastState {
  key: number;
  open: boolean;
  title: string;
  description: string;
  rewards: RewardBadgeItem[];
  showRewardPlusSign: boolean;
  variant: ToastVariant;
}

const equipmentSlots: Array<{
  key: keyof BattlePlayerEquipment;
  label: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  { key: "helmet", label: "Helmet", icon: HardHatIcon },
  { key: "leftWeapon", label: "Left", icon: ShieldIcon },
  { key: "chest", label: "Chest", icon: ShirtIcon },
  { key: "rightWeapon", label: "Right", icon: SwordIcon },
  { key: "pants", label: "Pants", icon: PersonStandingIcon },
  { key: "boots", label: "Boots", icon: FootprintsIcon },
];

function PlayerRow({
  player,
  isBattling,
  onBattle,
  onOpenProfile,
}: {
  player: BattlePlayer;
  isBattling: boolean;
  onBattle: () => void;
  onOpenProfile: () => void;
}) {
  const avatarUrl = player.avatar ? resolveAssetUrl(player.avatar) : null;

  return (
    <article className="grid gap-4 rounded-xl border bg-card p-4 xl:grid-cols-[220px_minmax(0,1fr)_180px_120px_170px] xl:items-center">
      <button
        type="button"
        className="flex min-w-0 items-center gap-3 rounded-lg text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onOpenProfile}
      >
        <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted/30">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={`${player.username} avatar`}
              className="h-full w-full object-cover"
            />
          ) : (
            <UserCircle2Icon className="size-10 text-muted-foreground/70" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-base font-semibold break-all hover:underline">
            {player.username}
          </span>
        </span>
      </button>

      <TooltipProvider>
        <div className="grid grid-cols-3 gap-2">
          {equipmentSlots.map((slot) => (
            <ProfileItemSlot
              key={slot.key}
              label={slot.label}
              icon={slot.icon}
              item={player.equipment[slot.key]}
              className="h-16 w-16"
            />
          ))}
        </div>
      </TooltipProvider>

      <TooltipProvider>
        <div className="grid grid-cols-2 gap-2">
          <AttributeBadge attribute="strength" value={player.stats.strength} />
          <AttributeBadge attribute="charisma" value={player.stats.charisma} />
          <AttributeBadge attribute="endurance" value={player.stats.endurance} />
          <AttributeBadge attribute="intelligence" value={player.stats.intelligence} />
        </div>
      </TooltipProvider>

      <div className="rounded-lg border bg-muted/10 px-3 py-2 text-center">
        <p className="text-muted-foreground text-xs">Win Chance</p>
        <p className="font-semibold tabular-nums">{player.winChancePercent.toFixed(2)}%</p>
      </div>

      <Button
        type="button"
        disabled={!player.isBattleAvailableToday || isBattling}
        onClick={onBattle}
      >
        {isBattling ? "Battling..." : player.isBattleAvailableToday ? "Battle" : "Done"}
      </Button>
    </article>
  );
}

export function BattlesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useClientAuthStore((state) => state.session);
  const setSession = useClientAuthStore((state) => state.setSession);

  const playersQuery = useBattlePlayersQuery();
  const startBattleMutation = useStartBattleMutation();
  const [battlingUserId, setBattlingUserId] = useState<string | null>(null);
  const [toastState, setToastState] = useState<ToastState>({
    key: 0,
    open: false,
    title: "",
    description: "",
    rewards: [],
    showRewardPlusSign: true,
    variant: "default",
  });

  const players = useMemo(() => playersQuery.data?.players ?? [], [playersQuery.data?.players]);

  function showToast(
    title: string,
    description: string,
    rewards: RewardBadgeItem[] = [],
    showRewardPlusSign = true,
    variant: ToastVariant = "default",
  ) {
    setToastState((previousState) => ({
      key: previousState.key + 1,
      open: true,
      title,
      description,
      rewards,
      showRewardPlusSign,
      variant,
    }));
  }

  async function handleBattle(player: BattlePlayer) {
    if (battlingUserId) {
      return;
    }

    setBattlingUserId(player.userId);

    try {
      const response = await startBattleMutation.mutateAsync(player.userId);

      if (session) {
        setSession({
          ...session,
          user: {
            ...session.user,
            balance: response.updatedCurrentUserBalance,
            gameScore: response.updatedCurrentUserGameScore,
          },
        });
      }

      queryClient.setQueryData(
        queryKeys.battlesPlayers,
        (previous: { players: BattlePlayer[] } | undefined) => {
          if (!previous) {
            return previous;
          }

          return {
            players: previous.players.map((entry) =>
              entry.userId === player.userId ? { ...entry, isBattleAvailableToday: false } : entry,
            ),
          };
        },
      );

      await queryClient.invalidateQueries({
        queryKey: queryKeys.battlesPlayers,
      });

      const battleRewards: RewardBadgeItem[] = [];
      if (response.result === "win") {
        battleRewards.push({ kind: "balance", value: response.transferredCoins });
        if (response.gameScoreReward) {
          battleRewards.push({ kind: "gameScore", value: response.gameScoreReward });
        }
      }

      showToast(
        response.result === "win" ? "You won the battle" : "You lost the battle",
        response.result === "win" ? "Rewards received:" : "No gold lost.",
        battleRewards,
        response.result === "win",
      );
    } catch (error: unknown) {
      showToast(
        "Battle failed",
        error instanceof Error ? error.message : "Unable to start battle.",
        [],
        true,
        "destructive",
      );
    } finally {
      setBattlingUserId(null);
    }
  }

  if (playersQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Failed to Load Battles</CardTitle>
          <CardDescription>
            {playersQuery.error instanceof Error ? playersQuery.error.message : "Unexpected error"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={() => playersQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <ToastProvider duration={3500} swipeDirection="right">
      <section className="space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">Battles</h1>
          <p className="text-muted-foreground text-sm">
            Challenge other players once per day and earn gold by winning.
          </p>
        </div>

        {playersQuery.isPending ? (
          <Card>
            <CardContent className="py-10">
              <p className="text-muted-foreground text-sm">Loading battle players...</p>
            </CardContent>
          </Card>
        ) : players.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <p className="text-muted-foreground text-sm">No opponents available right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {players.map((player) => (
              <PlayerRow
                key={player.userId}
                player={player}
                isBattling={battlingUserId === player.userId}
                onBattle={() => void handleBattle(player)}
                onOpenProfile={() => router.push(publicUserRoutes.profile(player.username))}
              />
            ))}
          </div>
        )}
      </section>

      <Toast
        key={toastState.key}
        open={toastState.open}
        onOpenChange={(open) => setToastState((previousState) => ({ ...previousState, open }))}
        variant={toastState.variant}
      >
        <div className="grid gap-1">
          <ToastTitle>{toastState.title}</ToastTitle>
          <ToastDescription>{toastState.description}</ToastDescription>
          {toastState.rewards.length > 0 ? (
            <RewardBadgesList
              rewards={toastState.rewards}
              showPlusSign={toastState.showRewardPlusSign}
            />
          ) : null}
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
