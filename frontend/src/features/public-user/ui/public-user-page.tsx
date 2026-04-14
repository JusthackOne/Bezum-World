"use client";

import {
  BrainIcon,
  CoinsIcon,
  DumbbellIcon,
  FootprintsIcon,
  HardHatIcon,
  PersonStandingIcon,
  ShieldIcon,
  ShirtIcon,
  SparklesIcon,
  SwordIcon,
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
import { formatBalance, getItemAttributeRows, resolveAssetUrl } from "@/shared/lib/item-display";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { AvatarImage } from "@/shared/ui/avatar-image";
import { GameScoreIcon } from "@/shared/ui";
import { ItemDetailsModal } from "@/shared/ui";
import { ItemDisplayCard } from "@/shared/ui";
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

const equipmentRarityStyles: Record<
  string,
  {
    slotBorderClassName: string;
    slotGlowClassName: string;
    tooltipBorderClassName: string;
    tooltipSideAccentClassName: string;
  }
> = {
  unterlyanskiy: {
    slotBorderClassName: "border-amber-900/95",
    slotGlowClassName: "shadow-[0_0_0_1px_rgba(120,53,15,0.42),0_0_18px_rgba(69,26,3,0.28)]",
    tooltipBorderClassName: "border-amber-900/95 shadow-[0_0_0_1px_rgba(120,53,15,0.38),0_10px_24px_rgba(69,26,3,0.25)]",
    tooltipSideAccentClassName: "[&>div]:bg-amber-900",
  },
  basic_minimum: {
    slotBorderClassName: "border-emerald-400/95",
    slotGlowClassName: "shadow-[0_0_0_1px_rgba(16,185,129,0.38),0_0_18px_rgba(6,95,70,0.26)]",
    tooltipBorderClassName:
      "border-emerald-400/95 shadow-[0_0_0_1px_rgba(16,185,129,0.34),0_10px_24px_rgba(6,95,70,0.24)]",
    tooltipSideAccentClassName: "[&>div]:bg-emerald-400",
  },
  sigma: {
    slotBorderClassName: "border-violet-400/95",
    slotGlowClassName: "shadow-[0_0_0_1px_rgba(167,139,250,0.4),0_0_20px_rgba(91,33,182,0.28)]",
    tooltipBorderClassName:
      "border-violet-400/95 shadow-[0_0_0_1px_rgba(167,139,250,0.36),0_10px_24px_rgba(91,33,182,0.24)]",
    tooltipSideAccentClassName: "[&>div]:bg-violet-400",
  },
  bezumnyy: {
    slotBorderClassName: "border-amber-300/95",
    slotGlowClassName: "shadow-[0_0_0_1px_rgba(251,191,36,0.42),0_0_20px_rgba(180,83,9,0.3)]",
    tooltipBorderClassName:
      "border-amber-300/95 shadow-[0_0_0_1px_rgba(251,191,36,0.38),0_10px_24px_rgba(180,83,9,0.25)]",
    tooltipSideAccentClassName: "[&>div]:bg-amber-300",
  },
};

const itemAttributeVisuals: Record<
  "strength" | "intelligence" | "charisma" | "endurance",
  {
    iconClassName: string;
    badgeClassName: string;
    valueClassName: string;
  }
> = {
  strength: {
    iconClassName: "text-red-400",
    badgeClassName:
      "border-red-400/65 bg-red-500/12 shadow-[0_0_0_1px_rgba(248,113,113,0.24),0_0_14px_rgba(239,68,68,0.14)]",
    valueClassName: "text-red-100",
  },
  intelligence: {
    iconClassName: "text-blue-400",
    badgeClassName:
      "border-blue-400/65 bg-blue-500/12 shadow-[0_0_0_1px_rgba(96,165,250,0.24),0_0_14px_rgba(59,130,246,0.14)]",
    valueClassName: "text-blue-100",
  },
  charisma: {
    iconClassName: "text-emerald-400",
    badgeClassName:
      "border-emerald-400/65 bg-emerald-500/12 shadow-[0_0_0_1px_rgba(52,211,153,0.22),0_0_14px_rgba(16,185,129,0.14)]",
    valueClassName: "text-emerald-100",
  },
  endurance: {
    iconClassName: "text-violet-400",
    badgeClassName:
      "border-violet-400/65 bg-violet-500/12 shadow-[0_0_0_1px_rgba(196,181,253,0.24),0_0_14px_rgba(139,92,246,0.14)]",
    valueClassName: "text-violet-100",
  },
};

const itemRarityTextStyles: Record<string, string> = {
  unterlyanskiy: "text-amber-700 dark:text-amber-300",
  basic_minimum: "text-emerald-600 dark:text-emerald-300",
  sigma: "text-violet-600 dark:text-violet-300",
  bezumnyy: "text-amber-500 dark:text-amber-300",
};

const hiddenScrollbarClass =
  "overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function ItemQuickTooltip({ item }: { item: PublicUserItem }) {
  const itemAttributes = getItemAttributeRows(item);
  const rarityTextClassName = itemRarityTextStyles[item.rarity] ?? "text-foreground";

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{item.name}</p>

      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-[10px]">Rarity</span>
        <span className={cn("text-[11px] font-semibold capitalize", rarityTextClassName)}>
          {item.rarity.replaceAll("_", " ")}
        </span>
      </div>

      {itemAttributes.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">
          {itemAttributes.map((attribute) => {
            const Icon = attribute.icon;
            const visual = itemAttributeVisuals[attribute.key];

            return (
              <div
                key={attribute.key}
                className={cn(
                  "flex items-center justify-between rounded border px-1.5 py-1",
                  visual.badgeClassName,
                )}
              >
                <Icon className={cn("size-3", visual.iconClassName)} />
                <span className={cn("text-[10px] font-semibold tabular-nums", visual.valueClassName)}>
                  +{attribute.value}
                </span>
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
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null);
  const hasImage = Boolean(imageUrl) && failedImageUrl !== imageUrl;
  const rarityStyle = item
    ? equipmentRarityStyles[item.rarity] ?? {
        slotBorderClassName: "border-border/70",
        slotGlowClassName: "shadow-sm",
        tooltipBorderClassName: "border-border shadow-sm",
        tooltipSideAccentClassName: "",
      }
    : null;

  const trigger = (
    <div
      className={cn(
        "bg-muted/20 relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 transition-colors",
        rarityStyle?.slotBorderClassName ?? "border-border/70",
        rarityStyle?.slotGlowClassName,
      )}
    >
      {hasImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl ?? ""}
          alt={item?.name ?? label}
          className="h-full w-full object-cover"
          onError={() => setFailedImageUrl(imageUrl)}
        />
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
      <TooltipContent
        className={cn(
          "border-2 bg-card text-foreground w-64 p-3",
          rarityStyle.tooltipBorderClassName,
        )}
        sideOffset={8}
      >
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
      <div
        className="mx-auto inline-grid grid-cols-[repeat(3,5rem)] grid-rows-[repeat(4,5rem)] place-items-center gap-x-3 gap-y-2.5"
        style={{
          gridTemplateAreas: `
            ". helmet ."
            "left chest right"
            ". pants ."
            ". boots ."
          `,
        }}
      >
        <div className="flex justify-center" style={{ gridArea: "helmet" }}>
          <EquipmentSlot label="Helmet" icon={HardHatIcon} item={equipment.helmet} />
        </div>
        <div className="flex items-center justify-center" style={{ gridArea: "left" }}>
          <EquipmentSlot label="Left" icon={ShieldIcon} item={equipment.leftWeapon} />
        </div>
        <div className="flex justify-center" style={{ gridArea: "chest" }}>
          <EquipmentSlot label="Chest" icon={ShirtIcon} item={equipment.chest} />
        </div>
        <div className="flex items-center justify-center" style={{ gridArea: "right" }}>
          <EquipmentSlot label="Right" icon={SwordIcon} item={equipment.rightWeapon} />
        </div>
        <div className="flex justify-center" style={{ gridArea: "pants" }}>
          <EquipmentSlot label="Pants" icon={PersonStandingIcon} item={equipment.pants} />
        </div>
        <div className="flex justify-center" style={{ gridArea: "boots" }}>
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

  return (
    <Card className="flex h-full min-h-0 flex-col lg:max-h-full">
      <CardHeader className="pb-0">
        <CardTitle>User Profile</CardTitle>
        <CardDescription>Public information and base attributes.</CardDescription>
      </CardHeader>
      <CardContent className={cn("min-h-0 flex-1 space-y-5 pr-4", hiddenScrollbarClass)}>
        <div className="flex justify-center">
          <AvatarImage
            avatarUrl={profile.profilePhoto}
            alt={`${profile.username} avatar`}
            sizeClassName="h-52 w-52"
          />
        </div>
        <h1 className="text-2xl font-semibold break-all">{profile.username}</h1>
        <Separator />
        <div className="flex justify-center">
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
  equipment,
  canEquip,
  isEquipping,
  onEquip,
  isPending,
}: {
  profileUsername: string;
  items: PublicUserItem[];
  equipment: PublicUserEquipment;
  canEquip: boolean;
  isEquipping: boolean;
  onEquip: (itemId: string) => void;
  isPending: boolean;
}) {
  const [selectedItem, setSelectedItem] = useState<PublicUserItem | null>(null);
  const equippedItemIds = useMemo(() => {
    return new Set(
      [
        equipment.helmet?.id,
        equipment.chest?.id,
        equipment.pants?.id,
        equipment.boots?.id,
        equipment.leftWeapon?.id,
        equipment.rightWeapon?.id,
      ].filter((itemId): itemId is string => Boolean(itemId)),
    );
  }, [equipment]);

  return (
    <>
      <Card className="flex h-full min-h-0 flex-col lg:max-h-full">
        <CardHeader>
          <CardTitle>{profileUsername} Items</CardTitle>
          <CardDescription>
            {isPending
              ? "Loading items..."
              : `${items.length} item${items.length === 1 ? "" : "s"} in inventory`}
          </CardDescription>
        </CardHeader>
        <CardContent className={cn("min-h-0 flex-1 space-y-4 overflow-x-hidden pr-4", hiddenScrollbarClass)}>
          {isPending ? (
            <p className="text-muted-foreground text-sm">Loading items...</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground text-sm">No items found for this user.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
              {items.map((item) => {
                const isEquipped = equippedItemIds.has(item.id);
                const actionLabel = isEquipped ? "Unequip" : "Equip";

                return (
                  <ItemDisplayCard
                    key={item.id}
                    item={item}
                    onOpenDetails={setSelectedItem}
                    actionLabel={canEquip ? actionLabel : undefined}
                    onAction={canEquip ? (clickedItem) => onEquip(clickedItem.id) : undefined}
                    actionDisabled={isEquipping}
                    actionAriaLabel={`${actionLabel} ${item.name}`}
                  />
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
    <section className="min-h-screen overflow-x-hidden p-4 sm:p-6 lg:h-[100dvh] lg:overflow-hidden lg:p-8">
      <div className="mx-auto grid w-full max-w-[110rem] gap-6 lg:h-full lg:grid-cols-[320px_minmax(0,1fr)]">
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
            equipment={equipmentQuery.data ?? {}}
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
