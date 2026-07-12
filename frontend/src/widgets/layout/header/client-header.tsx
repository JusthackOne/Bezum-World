"use client";

import Link from "next/link";

import { useClientAuthStore } from "@/features/auth/model/client-auth.store";
import { publicUserRoutes } from "@/features/public-user/routes";
import { AvatarImage, RewardBadgesList, SidebarTrigger } from "@/shared/ui";

export function ClientHeader() {
  const user = useClientAuthStore((state) => state.session?.user);
  const profileHref = user?.username ? publicUserRoutes.profile(user.username) : "/user";
  const username = user?.username ?? "Current user";

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b bg-card/95 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-card/80 md:px-8">
      <SidebarTrigger className="size-9 rounded-full border bg-background shadow-sm" />

      <nav aria-label="User account" className="flex items-center gap-3">
        <RewardBadgesList
          rewards={[
            { kind: "gameScore", value: user?.gameScore ?? 0 },
            { kind: "balance", value: user?.balance ?? 0 },
          ]}
          showPlusSign={false}
          className="flex-nowrap gap-2"
        />

        <Link
          href={profileHref}
          aria-label={`Open ${username}'s profile`}
          className="shrink-0 rounded-full outline-none ring-offset-background transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <AvatarImage
            avatarUrl={user?.avatarUrl ?? null}
            alt={`${username} avatar`}
            sizeClassName="size-9"
            className="border-border shadow-sm"
          />
        </Link>
      </nav>
    </header>
  );
}
