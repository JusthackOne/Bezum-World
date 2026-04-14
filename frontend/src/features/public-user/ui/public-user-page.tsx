"use client";

import {
  BrainIcon,
  CoinsIcon,
  DumbbellIcon,
  FootprintsIcon,
  HardHatIcon,
  PersonStandingIcon,
  ShieldCheckIcon,
  ShieldIcon,
  ShirtIcon,
  SparklesIcon,
  SwordIcon,
  UserCircle2Icon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ComponentType } from "react";

import { useClientAuthStore } from "@/features/auth/model/client-auth.store";
import {
  useEquipUserItemMutation,
  usePublicUserItemsQuery,
  usePublicUserProfileQuery,
  useUserEquipmentQuery,
} from "@/features/public-user/api";
import type {
  PublicUserEquipment,
  PublicUserItem,
  PublicUserProfile,
} from "@/features/public-user/model/public-user.types";
import { queryKeys } from "@/shared/config/query-keys";
import {
  formatBalance,
  getItemAttributeRows,
  itemRarityStyles,
  resolveAssetUrl,
} from "@/shared/lib/item-display";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { GameScoreIcon } from "@/shared/ui";
import { ItemDetailsModal } from "@/shared/ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/8bit/tooltip";
import { Separator } from "@/shared/ui/8bit";

interface PublicUserPageProps {
  username: string;
}

interface AttributeVisualConfig {
  key: "strength" | "charisma" | "endurance" | "intelligence";
  icon: ComponentType<{ className?: string }>;
  label: string;
  accentClassName: string;
  iconClassName: string;
}

const attributeVisuals: AttributeVisualConfig[] = [
  {
    key: "strength",
    label: "Strength",
    icon: DumbbellIcon,
    accentClassName:
      "border-red-400/65 bg-red-500/8 shadow-[0_0_0_1px_rgba(248,113,113,0.28),0_0_18px_rgba(239,68,68,0.16)]",
    iconClassName: "text-red-400",
  },
  {
    key: "intelligence",
    label: "Intelligence",
    icon: BrainIcon,
    accentClassName:
      "border-blue-400/65 bg-blue-500/8 shadow-[0_0_0_1px_rgba(96,165,250,0.28),0_0_18px_rgba(59,130,246,0.16)]",
    iconClassName: "text-blue-400",
  },
  {
    key: "charisma",
    label: "Charisma",
    icon: SparklesIcon,
    accentClassName:
      "border-emerald-400/65 bg-emerald-500/8 shadow-[0_0_0_1px_rgba(52,211,153,0.26),0_0_18px_rgba(16,185,129,0.15)]",
    iconClassName: "text-emerald-400",
  },
  {
    key: "endurance",
    label: "Endurance",
    icon: ShieldIcon,
    accentClassName:
      "border-violet-400/65 bg-violet-500/8 shadow-[0_0_0_1px_rgba(196,181,253,0.28),0_0_18px_rgba(139,92,246,0.16)]",
    iconClassName: "text-violet-400",
  },
];

function getUserAttributeRows(profile: PublicUserProfile) {
  return attributeVisuals.map(({ key, icon: Icon, label, accentClassName, iconClassName }) => ({
    key,
    label,
    icon: Icon,
    accentClassName,
    iconClassName,
    value: profile.attributes[key],
  }));
}

function ItemQuickTooltip({ item }: { item: PublicUserItem }) {
  const itemAttributes = getItemAttributeRows(item);

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{item.name}</p>
        <p className="text-muted-foreground text-xs">
          {item.description ?? "No description available."}
        </p>
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
  item,
  icon: Icon,
}: {
  label: string;
  item?: PublicUserItem;
  icon: ComponentType<{ className?: string }>;
}) {
  const imageUrl = item?.image_url ? resolveAssetUrl(item.image_url) : null;

  const trigger = (
    <div className="bg-muted/20 hover:border-primary/50 relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border transition-colors">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={item?.name ?? label} className="h-full w-full object-cover" />
      ) : (
        <>
          <Icon className="text-muted-foreground/45 size-9" />
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

function UserEquipmentSection({
  equipment,
  isPending,
  isError,
  onRetry,
  isRetrying,
}: {
  equipment: PublicUserEquipment;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  if (isPending) {
    return <p className="text-muted-foreground text-sm">Loading equipment...</p>;
  }

  if (isError) {
    return (
      <div className="space-y-2">
        <p className="text-destructive text-sm">Failed to load equipment.</p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry} disabled={isRetrying}>
          Retry equipment
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="mx-auto grid max-w-72.5 grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-2.5">
        <div className="col-start-2 row-start-1 flex justify-center">
          <EquipmentSlot label="Helmet" icon={HardHatIcon} item={equipment.helmet} />
        </div>
        <div className="col-start-1 row-start-2 flex items-center justify-center">
          <EquipmentSlot label="Left" icon={ShieldIcon} item={equipment.leftWeapon} />
        </div>
        <div className="col-start-2 row-start-2 flex justify-center">
          <EquipmentSlot label="Chest" icon={ShirtIcon} item={equipment.chest} />
        </div>
        <div className="col-start-3 row-start-2 flex items-center justify-center">
          <EquipmentSlot label="Right" icon={SwordIcon} item={equipment.rightWeapon} />
        </div>
        <div className="col-start-2 row-start-3 flex justify-center">
          <EquipmentSlot label="Pants" icon={PersonStandingIcon} item={equipment.pants} />
        </div>
        <div className="col-start-2 row-start-4 flex justify-center">
          <EquipmentSlot label="Boots" icon={FootprintsIcon} item={equipment.boots} />
        </div>
      </div>
    </TooltipProvider>
  );
}

function UserInfoCard({
  profile,
  equipment,
  isEquipmentPending,
  isEquipmentError,
  onRetryEquipment,
  isEquipmentRefetching,
}: {
  profile: PublicUserProfile;
  equipment: PublicUserEquipment;
  isEquipmentPending: boolean;
  isEquipmentError: boolean;
  onRetryEquipment: () => void;
  isEquipmentRefetching: boolean;
  onRetry: () => void;
  isRetrying: boolean;
}) {
  const userAttributeRows = useMemo(() => getUserAttributeRows(profile), [profile]);
  const avatarUrl = profile.profilePhoto ? resolveAssetUrl(profile.profilePhoto) : null;

  return (
    <Card className="h-fit">
      <CardHeader className="pb-0">
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Public information and base attributes.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex justify-center">
          <div className="flex h-52 w-52 items-center justify-center overflow-hidden rounded-2xl border bg-muted/30">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt={`${profile.username} avatar`}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserCircle2Icon className="size-24 text-muted-foreground/70" />
            )}
          </div>
        </div>
        <h1 className="text-2xl font-semibold break-all">{profile.username}</h1>
        <Separator />
        <div className="space-y-2">
          <UserEquipmentSection
            equipment={equipment}
            isPending={isEquipmentPending}
            isError={isEquipmentError}
            onRetry={onRetryEquipment}
            isRetrying={isEquipmentRefetching}
          />
        </div>
        <div className="flex flex-col">
          <TooltipProvider>
            <div className="flex gap-1 flex-col">
              {userAttributeRows.map((attribute) => {
                const Icon = attribute.icon;

                return (
                  <Tooltip key={attribute.key}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-3 py-2",
                          attribute.accentClassName,
                        )}
                      >
                        <Icon className={cn("size-4", attribute.iconClassName)} />
                        <span className="text-sm font-semibold tabular-nums">
                          {attribute.value}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      {attribute.label}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
            <Separator className="mt-4" />
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-lg border mt-4 border-fuchsia-400/60 bg-[linear-gradient(120deg,rgba(244,114,182,0.12),rgba(96,165,250,0.12),rgba(52,211,153,0.12),rgba(250,204,21,0.12))] px-3 py-2.5 shadow-[0_0_0_1px_rgba(217,70,239,0.25),0_0_20px_rgba(59,130,246,0.18)]">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <GameScoreIcon className="size-4 text-fuchsia-300" />
                      <span className="sr-only">GameScore</span>
                    </span>
                    <span className="bg-gradient-to-r from-fuchsia-300 via-sky-300 to-emerald-300 bg-clip-text text-base font-semibold tabular-nums text-transparent">
                      {formatBalance(profile.gameScore)}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>

              <TooltipContent side="top" sideOffset={6}>
                GameScore
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-lg border mt-2.5 border-amber-400/70 bg-[linear-gradient(120deg,rgba(250,204,21,0.13),rgba(251,191,36,0.08))] px-3 py-2.5 shadow-[0_0_0_1px_rgba(245,158,11,0.26),0_0_18px_rgba(245,158,11,0.18)]">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2">
                      <CoinsIcon className="size-4 text-amber-300" />
                      <span className="sr-only">Balance</span>
                    </span>
                    <span className="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-base font-semibold tabular-nums text-transparent">
                      {formatBalance(profile.balance)}
                    </span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={6}>
                Balance
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}

function UserItemsCard({
  profileUsername,
  items,
  canEquip,
  isEquipping,
  onEquip,
  isPending,
}: {
  profileUsername: string;
  items: PublicUserItem[];
  canEquip: boolean;
  isEquipping: boolean;
  onEquip: (itemId: string) => void;
  isPending: boolean;
}) {
  const [selectedItem, setSelectedItem] = useState<PublicUserItem | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{profileUsername} Items</CardTitle>
          <CardDescription>
            {isPending
              ? "Loading items..."
              : `${items.length} item${items.length === 1 ? "" : "s"} in inventory`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPending ? (
            <p className="text-muted-foreground text-sm">Loading items...</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No items found for this user.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((item) => {
                const rarityStyle = itemRarityStyles[item.rarity] ?? {
                  borderClassName: "border-border",
                  glowClassName: "shadow-sm",
                };
                const itemAttributes = getItemAttributeRows(item);
                const imageUrl = item.image_url ? resolveAssetUrl(item.image_url) : null;

                return (
                  <article
                    key={item.id}
                    className={cn(
                      "flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-card transition-shadow",
                      rarityStyle.borderClassName,
                      rarityStyle.glowClassName,
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedItem(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedItem(item);
                      }
                    }}
                  >
                    <div className="aspect-4/3 w-full overflow-hidden bg-muted/35">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No image
                        </div>
                      )}
                    </div>

                    <div className="flex h-full flex-col gap-3 p-4">
                      <h2 className="text-base leading-tight font-semibold">{item.name}</h2>

                      {itemAttributes.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {itemAttributes.map((attribute) => {
                            const Icon = attribute.icon;

                            return (
                              <div
                                key={attribute.key}
                                className="flex items-center justify-between rounded-md border bg-muted/15 px-2 py-1.5"
                              >
                                <Icon className="size-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium tabular-nums">
                                  {attribute.value}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs">No attributes</p>
                      )}

                      <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold">
                          <CoinsIcon className="size-4" />
                          {formatBalance(item.price)}
                        </span>

                        {canEquip ? (
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            disabled={isEquipping}
                            onClick={(event) => {
                              event.stopPropagation();
                              onEquip(item.id);
                            }}
                            aria-label={`Equip ${item.name}`}
                          >
                            <ShieldCheckIcon className="size-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ItemDetailsModal
        item={selectedItem}
        open={selectedItem !== null}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      />
    </>
  );
}

export function PublicUserPage({ username }: PublicUserPageProps) {
  const queryClient = useQueryClient();

  const initializeSession = useClientAuthStore((state) => state.initializeSession);
  const isSessionInitialized = useClientAuthStore((state) => state.isInitialized);
  const session = useClientAuthStore((state) => state.session);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  const profileQuery = usePublicUserProfileQuery(username);
  const itemsQuery = usePublicUserItemsQuery(username);
  const equipmentQuery = useUserEquipmentQuery(
    profileQuery.data?.id ?? "",
    Boolean(profileQuery.data?.id),
  );
  const equipMutation = useEquipUserItemMutation();

  const isOwnProfile =
    isSessionInitialized &&
    Boolean(session?.user.id) &&
    Boolean(profileQuery.data?.id) &&
    session?.user.id === profileQuery.data?.id;

  if (profileQuery.isPending && !profileQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Loading profile</CardTitle>
            <CardDescription>Fetching user profile data...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>Failed to load user</CardTitle>
            <CardDescription>
              {profileQuery.error instanceof Error
                ? profileQuery.error.message
                : "Unable to fetch user profile."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => profileQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <section className="min-h-screen bg-muted/20 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <UserInfoCard
          profile={profileQuery.data}
          equipment={equipmentQuery.data ?? {}}
          isEquipmentPending={equipmentQuery.isPending}
          isEquipmentError={equipmentQuery.isError}
          onRetryEquipment={() => equipmentQuery.refetch()}
          isEquipmentRefetching={equipmentQuery.isRefetching}
          onRetry={() => profileQuery.refetch()}
          isRetrying={profileQuery.isRefetching}
        />

        {itemsQuery.isError ? (
          <Card>
            <CardHeader>
              <CardTitle>Failed to load items</CardTitle>
              <CardDescription>
                {itemsQuery.error instanceof Error
                  ? itemsQuery.error.message
                  : "Unable to fetch user items."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" onClick={() => itemsQuery.refetch()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : (
          <UserItemsCard
            profileUsername={profileQuery.data.username}
            items={itemsQuery.data?.items ?? []}
            canEquip={isOwnProfile}
            isEquipping={equipMutation.isPending}
            onEquip={(itemId) => {
              if (!profileQuery.data?.id) {
                return;
              }

              equipMutation.mutate(itemId, {
                onSuccess: (response) => {
                  queryClient.setQueryData(
                    queryKeys.userEquipment(profileQuery.data.id),
                    response.equipped,
                  );

                  void queryClient.invalidateQueries({
                    queryKey: queryKeys.userEquipment(profileQuery.data.id),
                  });
                  void queryClient.invalidateQueries({
                    queryKey: queryKeys.publicUserItems(profileQuery.data.username),
                  });
                },
              });
            }}
            isPending={itemsQuery.isPending}
          />
        )}
      </div>
    </section>
  );
}
