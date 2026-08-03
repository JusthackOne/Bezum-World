"use client";

import {
  CoinsIcon,
  FootprintsIcon,
  GemIcon,
  HardHatIcon,
  PersonStandingIcon,
  ShieldIcon,
  ShirtIcon,
  SwordIcon,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { useClientAuthStore } from "@/features/auth/model/client-auth.store";
import {
  useEquipUserItemMutation,
  useListUserItemForSaleMutation,
  usePublicUserItemsQuery,
  usePublicUserProfileQuery,
  useRemoveUserItemFromSaleMutation,
  useUnequipUserItemMutation,
  useUserEquipmentQuery,
} from "@/features/public-user/api";
import type {
  PublicUserEquipment,
  PublicUserItem,
  PublicUserProfile,
} from "@/features/public-user/model/public-user.types";
import { queryKeys } from "@/shared/config/query-keys";
import { formatBalance } from "@/shared/lib/item-display";
import { useClickTooltip } from "@/shared/lib/use-click-tooltip";
import type { ItemDisplay } from "@/shared/model/item-display.types";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { AvatarImage } from "@/shared/ui/avatar-image";
import {
  AttributeBadge,
  attributeVisuals,
  GameScoreIcon,
  ItemDetailsModal,
  ItemDisplayCard,
  ProfileItemSlot,
} from "@/shared/ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/8bit/tooltip";
import { Separator } from "@/shared/ui/8bit";

import { ItemMarketplaceDialogs } from "./item-marketplace-dialogs";

interface PublicUserPageProps {
  username: string;
}

type MobileProfileSection = "profile" | "inventory";

const hiddenScrollbarClass =
  "overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

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
    return <p className="text-sm text-muted-foreground">Loading equipment...</p>;
  }

  if (isError) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive">Failed to load equipment.</p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry} disabled={isRetrying}>
          Retry equipment
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="mx-auto flex flex-col items-center gap-2.5">
        <div
          className="inline-grid grid-cols-[repeat(3,5rem)] grid-rows-[repeat(4,5rem)] place-items-center gap-x-3 gap-y-2.5"
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
            <ProfileItemSlot label="Helmet" icon={HardHatIcon} item={equipment.helmet} />
          </div>
          <div className="flex items-center justify-center" style={{ gridArea: "left" }}>
            <ProfileItemSlot label="Left" icon={ShieldIcon} item={equipment.leftWeapon} />
          </div>
          <div className="flex justify-center" style={{ gridArea: "chest" }}>
            <ProfileItemSlot label="Chest" icon={ShirtIcon} item={equipment.chest} />
          </div>
          <div className="flex items-center justify-center" style={{ gridArea: "right" }}>
            <ProfileItemSlot label="Right" icon={SwordIcon} item={equipment.rightWeapon} />
          </div>
          <div className="flex justify-center" style={{ gridArea: "pants" }}>
            <ProfileItemSlot label="Pants" icon={PersonStandingIcon} item={equipment.pants} />
          </div>
          <div className="flex justify-center" style={{ gridArea: "boots" }}>
            <ProfileItemSlot label="Boots" icon={FootprintsIcon} item={equipment.boots} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <ProfileItemSlot
              key={index}
              label={`Accessory ${index + 1}`}
              displayLabel={`Acc. ${index + 1}`}
              icon={GemIcon}
              item={equipment.accessories?.[index]}
            />
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
}

function TappableProfileMetric({
  label,
  value,
  icon,
  className,
  valueClassName,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  className: string;
  valueClassName: string;
}) {
  const tooltip = useClickTooltip();

  return (
    <Tooltip open={tooltip.isOpen} onOpenChange={tooltip.handleOpenChange}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full touch-manipulation text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
            className,
          )}
          aria-label={label}
          data-click-tooltip-boundary={tooltip.boundaryId}
          onClick={tooltip.pinOpen}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              tooltip.pinOpen();
            }
          }}
        >
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2">
              {icon}
              <span className="sr-only">{label}</span>
            </span>
            <span className={valueClassName}>{formatBalance(value)}</span>
          </div>
        </button>
      </TooltipTrigger>

      <TooltipContent data-click-tooltip-boundary={tooltip.boundaryId} side="top" sideOffset={6}>
        {label}
      </TooltipContent>
    </Tooltip>
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
  const userAttributeRows = useMemo(
    () =>
      (Object.keys(attributeVisuals) as Array<keyof typeof attributeVisuals>).map((key) => ({
        key,
        label: attributeVisuals[key].label,
        value: profile.attributes[key],
      })),
    [profile],
  );

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
            <div className="flex flex-col gap-1">
              {userAttributeRows.map((attribute) => {
                return (
                  <AttributeBadge
                    key={attribute.key}
                    attribute={attribute.key}
                    value={attribute.value}
                    tooltipLabel={attribute.label}
                  />
                );
              })}
            </div>
            <Separator className="mt-4" />
            <TappableProfileMetric
              label="GameScore"
              value={profile.gameScore}
              icon={<GameScoreIcon className="size-4 text-fuchsia-300" />}
              className="mt-4 rounded-lg border border-fuchsia-400/60 bg-[linear-gradient(120deg,rgba(244,114,182,0.12),rgba(96,165,250,0.12),rgba(52,211,153,0.12),rgba(250,204,21,0.12))] px-3 py-2.5 shadow-[0_0_0_1px_rgba(217,70,239,0.25),0_0_20px_rgba(59,130,246,0.18)]"
              valueClassName="bg-gradient-to-r from-fuchsia-300 via-sky-300 to-emerald-300 bg-clip-text text-base font-semibold tabular-nums text-transparent"
            />
            <TappableProfileMetric
              label="Balance"
              value={profile.balance}
              icon={<CoinsIcon className="size-4 text-amber-300" />}
              className="mt-2.5 rounded-lg border border-amber-400/70 bg-[linear-gradient(120deg,rgba(250,204,21,0.13),rgba(251,191,36,0.08))] px-3 py-2.5 shadow-[0_0_0_1px_rgba(245,158,11,0.26),0_0_18px_rgba(245,158,11,0.18)]"
              valueClassName="bg-gradient-to-r from-amber-200 to-yellow-400 bg-clip-text text-base font-semibold tabular-nums text-transparent"
            />
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
  isEquipmentActionPending,
  isMarketplaceActionPending,
  equipmentActionError,
  onEquipmentAction,
  onListForSale,
  onRemoveFromSale,
  isPending,
}: {
  profileUsername: string;
  items: PublicUserItem[];
  equipment: PublicUserEquipment;
  canEquip: boolean;
  isEquipmentActionPending: boolean;
  isMarketplaceActionPending: boolean;
  equipmentActionError: string | null;
  onEquipmentAction: (itemId: string, isEquipped: boolean) => void;
  onListForSale: (itemId: string, price: number) => Promise<void>;
  onRemoveFromSale: (itemId: string) => Promise<void>;
  isPending: boolean;
}) {
  const [selectedItem, setSelectedItem] = useState<ItemDisplay | null>(null);
  const [itemToList, setItemToList] = useState<PublicUserItem | null>(null);
  const [itemToRemove, setItemToRemove] = useState<PublicUserItem | null>(null);
  const equippedItemIds = useMemo(() => {
    return new Set(
      [
        equipment.helmet?.id,
        equipment.chest?.id,
        equipment.pants?.id,
        equipment.boots?.id,
        equipment.leftWeapon?.id,
        equipment.rightWeapon?.id,
        ...(equipment.accessories ?? []).map((accessory) => accessory.id),
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
        <CardContent
          className={cn("min-h-0 flex-1 space-y-4 overflow-x-hidden pr-4", hiddenScrollbarClass)}
        >
          {equipmentActionError ? (
            <p role="alert" className="text-sm text-destructive">
              {equipmentActionError}
            </p>
          ) : null}
          {isPending ? (
            <p className="text-sm text-muted-foreground">Loading items...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items found for this user.</p>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {items.map((item) => {
                const isEquipped = equippedItemIds.has(item.id);
                const actionLabel = isEquipped ? "Unequip" : "Equip";

                return (
                  <ItemDisplayCard
                    key={item.id}
                    item={item}
                    onOpenDetails={setSelectedItem}
                    pricePosition="left-when-new"
                    actionLabel={canEquip ? actionLabel : undefined}
                    onAction={
                      canEquip
                        ? (clickedItem) => onEquipmentAction(clickedItem.id, isEquipped)
                        : undefined
                    }
                    actionDisabled={isEquipmentActionPending}
                    actionAriaLabel={`${actionLabel} ${item.name}`}
                    secondaryActionLabel={
                      canEquip ? (
                        item.isListedForSale ? (
                          <span className="inline-flex items-center justify-center gap-1">
                            <span>Remove from Sale</span>
                            <span aria-hidden="true">(</span>
                            <span className="inline-flex items-center gap-1">
                              <CoinsIcon className="size-3 text-amber-300" />
                              <span className="bg-linear-to-r from-amber-200 to-yellow-400 bg-clip-text font-semibold text-transparent tabular-nums">
                                {formatBalance(item.listingPrice ?? 0)}
                              </span>
                            </span>
                            <span aria-hidden="true">)</span>
                          </span>
                        ) : (
                          "List for Sale"
                        )
                      ) : undefined
                    }
                    onSecondaryAction={
                      canEquip
                        ? () => {
                            if (item.isListedForSale) {
                              setItemToRemove(item);
                            } else {
                              setItemToList(item);
                            }
                          }
                        : undefined
                    }
                    secondaryActionDisabled={isMarketplaceActionPending}
                    secondaryActionAriaLabel={
                      item.isListedForSale
                        ? `Remove ${item.name} from sale`
                        : `List ${item.name} for sale`
                    }
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
      <ItemMarketplaceDialogs
        itemToList={itemToList}
        itemToRemove={itemToRemove}
        isPending={isMarketplaceActionPending}
        onListOpenChange={(open) => !open && setItemToList(null)}
        onRemoveOpenChange={(open) => !open && setItemToRemove(null)}
        onList={onListForSale}
        onRemove={onRemoveFromSale}
      />
    </>
  );
}

function updateEquipmentCache(
  queryClient: ReturnType<typeof useQueryClient>,
  profile: PublicUserProfile,
  response: { equipped: PublicUserEquipment },
) {
  queryClient.setQueryData(queryKeys.userEquipment(profile.id), response.equipped);

  void queryClient.invalidateQueries({
    queryKey: queryKeys.userEquipment(profile.id),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.publicUserProfile(profile.username),
  });
  void queryClient.invalidateQueries({
    queryKey: queryKeys.publicUserItems(profile.username),
  });
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
  const [activeMobileSection, setActiveMobileSection] = useState<MobileProfileSection>("profile");
  const [equipmentActionError, setEquipmentActionError] = useState<string | null>(null);
  const equipmentQuery = useUserEquipmentQuery(
    profileQuery.data?.id ?? "",
    Boolean(profileQuery.data?.id),
  );
  const equipMutation = useEquipUserItemMutation();
  const unequipMutation = useUnequipUserItemMutation();
  const listForSaleMutation = useListUserItemForSaleMutation(username);
  const removeFromSaleMutation = useRemoveUserItemFromSaleMutation(username);

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
    <section className="min-h-screen overflow-x-hidden p-4 sm:p-6 lg:h-dvh lg:overflow-hidden lg:p-8">
      <div className="mx-auto grid w-full max-w-[110rem] gap-6 lg:h-full lg:grid-cols-[26rem_minmax(0,1fr)]">
        <div className="lg:hidden">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={activeMobileSection === "profile" ? "default" : "outline"}
              onClick={() => setActiveMobileSection("profile")}
            >
              Profile
            </Button>
            <Button
              type="button"
              variant={activeMobileSection === "inventory" ? "default" : "outline"}
              onClick={() => setActiveMobileSection("inventory")}
            >
              Inventory
            </Button>
          </div>
        </div>

        <div
          className={cn(
            activeMobileSection === "profile" ? "block" : "hidden",
            "min-h-0 lg:block lg:h-full",
          )}
        >
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
        </div>

        <div
          className={cn(
            activeMobileSection === "inventory" ? "block" : "hidden",
            "min-h-0 lg:block lg:h-full",
          )}
        >
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
              isEquipmentActionPending={equipMutation.isPending || unequipMutation.isPending}
              isMarketplaceActionPending={
                listForSaleMutation.isPending || removeFromSaleMutation.isPending
              }
              equipmentActionError={equipmentActionError}
              onEquipmentAction={(itemId, isEquipped) => {
                if (!profileQuery.data) {
                  return;
                }

                const mutation = isEquipped ? unequipMutation : equipMutation;
                setEquipmentActionError(null);
                mutation.mutate(itemId, {
                  onSuccess: (response) =>
                    profileQuery.data
                      ? updateEquipmentCache(queryClient, profileQuery.data, response)
                      : undefined,
                  onError: (error) =>
                    setEquipmentActionError(
                      error instanceof Error ? error.message : "Failed to update equipment.",
                    ),
                });
              }}
              onListForSale={async (itemId, price) => {
                await listForSaleMutation.mutateAsync({ itemId, price });
              }}
              onRemoveFromSale={async (itemId) => {
                await removeFromSaleMutation.mutateAsync(itemId);
              }}
              isPending={itemsQuery.isPending}
            />
          )}
        </div>
      </div>
    </section>
  );
}
