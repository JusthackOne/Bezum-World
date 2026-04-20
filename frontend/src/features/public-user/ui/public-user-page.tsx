"use client";

import {
  CoinsIcon,
  FootprintsIcon,
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
import { formatBalance } from "@/shared/lib/item-display";
import type { ItemDisplay } from "@/shared/model/item-display.types";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/8bit/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/8bit/card";
import { AvatarImage } from "@/shared/ui/avatar-image";
import { AttributeBadge, attributeVisuals, GameScoreIcon, ItemDetailsModal, ItemDisplayCard, ProfileItemSlot } from "@/shared/ui";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/8bit/tooltip";
import { Separator } from "@/shared/ui/8bit";

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
            <div className="flex gap-1 flex-col">
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
  const [selectedItem, setSelectedItem] = useState<ItemDisplay | null>(null);
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
  const [activeMobileSection, setActiveMobileSection] = useState<MobileProfileSection>("profile");
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
      </div>
    </section>
  );
}
