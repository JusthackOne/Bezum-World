"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  BrainIcon,
  DumbbellIcon,
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
import type { BattleEquipmentItem, BattlePlayer, BattlePlayerEquipment } from "@/features/battles/model/battles.types";
import { queryKeys } from "@/shared/config/query-keys";
import { getItemAttributeRows, resolveAssetUrl } from "@/shared/lib/item-display";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/shared/ui/toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";

type ToastVariant = "default" | "destructive";

interface ToastState {
  key: number;
  open: boolean;
  title: string;
  description: string;
  variant: ToastVariant;
}

interface AttributeVisual {
  key: "strength" | "intelligence" | "charisma" | "endurance";
  label: string;
  icon: ComponentType<{ className?: string }>;
}

const attributeVisuals: AttributeVisual[] = [
  { key: "strength", label: "Strength", icon: DumbbellIcon },
  { key: "intelligence", label: "Intelligence", icon: BrainIcon },
  { key: "charisma", label: "Charisma", icon: UserCircle2Icon },
  { key: "endurance", label: "Endurance", icon: ShieldIcon },
];

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

function ItemQuickTooltip({ item }: { item: BattleEquipmentItem }) {
  const itemAttributes = getItemAttributeRows(item);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{item.name}</p>
        <p className="text-muted-foreground text-xs">{item.description ?? "No description available."}</p>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Rarity</span>
        <span className="font-semibold capitalize">{item.rarity.replaceAll("_", " ")}</span>
      </div>

      {itemAttributes.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {itemAttributes.map((attribute) => {
            const Icon = attribute.icon;

            return (
              <div
                key={attribute.key}
                className="bg-muted/20 flex items-center justify-between rounded border px-1.5 py-1"
              >
                <Icon className="text-muted-foreground size-3" />
                <span className="text-xs font-medium tabular-nums">{attribute.value}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">No attributes</p>
      )}
    </div>
  );
}

function EquipmentSlot({
  label,
  icon: Icon,
  item,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  item?: BattleEquipmentItem;
}) {
  const imageUrl = item?.image_url ? resolveAssetUrl(item.image_url) : null;
  const trigger = (
    <div className="bg-muted/20 hover:border-primary/50 relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg border transition-colors">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={item?.name ?? label} className="h-full w-full object-cover" />
      ) : (
        <>
          <Icon className="text-muted-foreground/45 size-6" />
          <span className="bg-background/90 absolute right-1 bottom-1 rounded px-1 py-0.5 text-[10px] leading-none">
            {label}
          </span>
        </>
      )}
    </div>
  );

  if (!item) {
    return trigger;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent className="border bg-card text-foreground w-64 p-3" sideOffset={8}>
        <ItemQuickTooltip item={item} />
      </TooltipContent>
    </Tooltip>
  );
}

function PlayerRow({
  player,
  isBattling,
  onBattle,
}: {
  player: BattlePlayer;
  isBattling: boolean;
  onBattle: () => void;
}) {
  const avatarUrl = player.avatar ? resolveAssetUrl(player.avatar) : null;

  return (
    <article className="grid gap-4 rounded-xl border bg-card p-4 xl:grid-cols-[220px_minmax(0,1fr)_180px_120px_170px] xl:items-center">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border bg-muted/30">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt={`${player.username} avatar`} className="h-full w-full object-cover" />
          ) : (
            <UserCircle2Icon className="size-10 text-muted-foreground/70" />
          )}
        </div>
        <div>
          <p className="text-base font-semibold break-all">{player.username}</p>
          <p className="text-muted-foreground text-xs">Opponent</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {equipmentSlots.map((slot) => (
          <EquipmentSlot
            key={slot.key}
            label={slot.label}
            icon={slot.icon}
            item={player.equipment[slot.key]}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {attributeVisuals.map((attribute) => {
          const Icon = attribute.icon;

          return (
            <div
              key={attribute.key}
              className="flex items-center justify-between rounded-md border bg-muted/15 px-2 py-1.5"
            >
              <Icon className="text-muted-foreground size-3.5" />
              <span className="text-xs font-medium tabular-nums">{player.stats[attribute.key]}</span>
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border bg-muted/10 px-3 py-2 text-center">
        <p className="text-muted-foreground text-xs">Win Chance</p>
        <p className="text-lg font-semibold tabular-nums">{player.winChancePercent.toFixed(2)}%</p>
      </div>

      <Button type="button" disabled={!player.isBattleAvailableToday || isBattling} onClick={onBattle}>
        {isBattling
          ? "Battling..."
          : player.isBattleAvailableToday
            ? "Battle"
            : "Already battled today"}
      </Button>
    </article>
  );
}

export function BattlesPage() {
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
    variant: "default",
  });

  const players = useMemo(() => playersQuery.data?.players ?? [], [playersQuery.data?.players]);

  function showToast(title: string, description: string, variant: ToastVariant = "default") {
    setToastState((previousState) => ({
      key: previousState.key + 1,
      open: true,
      title,
      description,
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

      showToast(
        response.result === "win" ? "You won the battle" : "You lost the battle",
        response.result === "win"
          ? `+${response.transferredCoins} coins${response.gameScoreReward ? `, +${response.gameScoreReward} GameScore` : ""}`
          : `-${response.transferredCoins} coins`,
      );
    } catch (error: unknown) {
      showToast(
        "Battle failed",
        error instanceof Error ? error.message : "Unable to start battle.",
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
            Challenge other players once per day and transfer coins by winning.
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
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
