"use client";

import {
  BrainIcon,
  CoinsIcon,
  DumbbellIcon,
  ShieldIcon,
  SparklesIcon,
  UserCircle2Icon,
} from "lucide-react";
import { useMemo, useState, type ComponentType } from "react";

import { usePublicUserItemsQuery, usePublicUserProfileQuery } from "@/features/public-user/api";
import type { PublicUserItem, PublicUserProfile } from "@/features/public-user/model/public-user.types";
import { formatBalance, getItemAttributeRows, itemRarityStyles, resolveAssetUrl } from "@/shared/lib/item-display";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { ItemDetailsModal } from "@/shared/ui/item-details-modal";

interface PublicUserPageProps {
  username: string;
}

interface AttributeVisualConfig {
  key: "strength" | "charisma" | "endurance" | "intelligence";
  icon: ComponentType<{ className?: string }>;
}

const attributeVisuals: AttributeVisualConfig[] = [
  { key: "strength", icon: DumbbellIcon },
  { key: "charisma", icon: SparklesIcon },
  { key: "endurance", icon: ShieldIcon },
  { key: "intelligence", icon: BrainIcon },
];

function getUserAttributeRows(profile: PublicUserProfile) {
  return attributeVisuals.map(({ key, icon: Icon }) => ({
    key,
    icon: Icon,
    value: profile.attributes[key],
  }));
}

function UserInfoCard({
  profile,
  onRetry,
  isRetrying,
}: {
  profile: PublicUserProfile;
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
        <div className="flex justify-start">
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

        <div className="space-y-2">
          {userAttributeRows.map((attribute) => {
            const Icon = attribute.icon;

            return (
              <div
                key={attribute.key}
                className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2"
              >
                <Icon className="size-4 text-muted-foreground" />
                <span className="text-sm font-semibold tabular-nums">{attribute.value}</span>
              </div>
            );
          })}
        </div>

        <div className="rounded-lg border bg-muted/15 px-3 py-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <CoinsIcon className="size-4" />
              Balance
            </span>
            <span className="text-base font-semibold tabular-nums">{formatBalance(profile.balance)}</span>
          </div>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={isRetrying}>
          Refresh profile
        </Button>
      </CardContent>
    </Card>
  );
}

function UserItemsCard({
  profileUsername,
  items,
  onRetry,
  isPending,
  isRefetching,
}: {
  profileUsername: string;
  items: PublicUserItem[];
  onRetry: () => void;
  isPending: boolean;
  isRefetching: boolean;
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
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={isRefetching}>
              Refresh items
            </Button>
          </div>

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
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted/35">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
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
                                <span className="text-xs font-medium tabular-nums">{attribute.value}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs">No attributes</p>
                      )}

                      <div className="mt-auto flex items-center justify-center pt-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold">
                          <CoinsIcon className="size-4" />
                          {formatBalance(item.price)}
                        </span>
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
  const profileQuery = usePublicUserProfileQuery(username);
  const itemsQuery = usePublicUserItemsQuery(username);

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
            onRetry={() => itemsQuery.refetch()}
            isPending={itemsQuery.isPending}
            isRefetching={itemsQuery.isRefetching}
          />
        )}
      </div>
    </section>
  );
}
