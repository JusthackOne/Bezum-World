"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ActivityIcon,
  ListTodoIcon,
  LogOutIcon,
  PanelLeftIcon,
  ShoppingBagIcon,
  SwordsIcon,
  TrophyIcon,
  type LucideIcon,
} from "lucide-react";

import { logoutClient } from "@/features/auth/api";
import { useClientAuthStore } from "@/features/auth/model/client-auth.store";
import { publicUserRoutes } from "@/features/public-user/routes";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { AvatarImage } from "@/shared/ui/avatar-image";
import { Button } from "@/shared/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarSeparator,
  SidebarHeader,
  useSidebar,
} from "@/shared/ui/sidebar";

interface ClientNavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
  isActive: boolean;
}

export function ClientSidebar() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const session = useClientAuthStore((state) => state.session);
  const clearSession = useClientAuthStore((state) => state.clearSession);

  const isShopActive = pathname.startsWith("/shop");
  const isBattlesActive = pathname.startsWith("/battles");
  const isTasksActive = pathname.startsWith("/tasks");
  const isLeaderboardActive = pathname.startsWith("/leaderboard");
  const isEventsActive = pathname.startsWith("/events");

  const username = session?.user.username ?? "Unknown user";
  const profileHref = session?.user.username
    ? publicUserRoutes.profile(session.user.username)
    : "/user";
  const navItems: ClientNavItem[] = [
    {
      href: "/shop",
      label: "Shop",
      Icon: ShoppingBagIcon,
      isActive: isShopActive,
    },
    {
      href: "/tasks",
      label: "Tasks",
      Icon: ListTodoIcon,
      isActive: isTasksActive,
    },
    {
      href: "/battles",
      label: "Battles",
      Icon: SwordsIcon,
      isActive: isBattlesActive,
    },
    {
      href: "/leaderboard",
      label: "LeaderBoard",
      Icon: TrophyIcon,
      isActive: isLeaderboardActive,
    },
    {
      href: "/events",
      label: "Events",
      Icon: ActivityIcon,
      isActive: isEventsActive,
    },
  ];

  const logoutMutation = useMutation({
    mutationFn: logoutClient,
    onSuccess: () => {
      setIsLogoutDialogOpen(false);
      clearSession();
      queryClient.clear();
      router.replace("/login");
    },
  });

  return (
    <>
      <Sidebar>
        <SidebarHeader className="gap-3 border-b border-sidebar-border/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Image
                src="/assets/images/logo.png"
                alt="BezUm World logo"
                width={28}
                height={28}
                className="h-10 w-10"
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-none tracking-wide">
                  Bezzumia
                </p>
                <p className="mt-1 text-xs text-sidebar-foreground/65">Social RPG</p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-sidebar-border/70 bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={toggleSidebar}
            >
              <PanelLeftIcon className="size-4" />
              <span className="sr-only">Collapse sidebar</span>
            </Button>
          </div>
        </SidebarHeader>
        <SidebarContent className="justify-center">
          <SidebarGroup className="px-3 py-2">
            <nav aria-label="Client navigation" className="mx-auto w-full max-w-[220px]">
              <div className="flex flex-col items-center gap-3 min-[800px]:gap-4">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={[
                      "group flex h-20 w-20 flex-col items-center justify-center rounded-full border transition-all duration-150 min-[380px]:h-[5.5rem] min-[380px]:w-[5.5rem] min-[800px]:h-24 min-[800px]:w-24",
                      item.isActive
                        ? "border-sidebar-primary bg-sidebar-primary text-white shadow-[0_0_0_3px_color-mix(in_oklch,var(--sidebar-primary)_25%,transparent)]"
                        : "border-sidebar-border border-2 bg-sidebar-accent/80 text-sidebar-foreground hover:border-sidebar-primary/70 hover:bg-sidebar-accent/60 hover:shadow-[0_0_22px_color-mix(in_oklch,var(--sidebar-primary)_28%,transparent)]",
                    ].join(" ")}
                  >
                    <item.Icon className="size-8 min-[800px]:size-9" />
                    <span className="mt-1 text-[13px] font-semibold leading-none tracking-wide min-[800px]:text-sm">
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>
            </nav>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="pt-0">
          <SidebarSeparator />
          <div className="flex items-center gap-3 rounded-md border border-sidebar-border/60 p-2">
            <Link href={profileHref} className="shrink-0">
              <AvatarImage
                avatarUrl={session?.user.avatarUrl ?? null}
                alt={`${username} avatar`}
                sizeClassName="h-10 w-10"
                className="border-sidebar-border"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={username}>
                {username}
              </p>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="mt-1 h-7 w-full justify-center gap-1 px-2 text-xs"
                onClick={() => setIsLogoutDialogOpen(true)}
              >
                <LogOutIcon className="size-3.5" />
                Logout
              </Button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {logoutMutation.isError ? (
            <p className="text-sm text-destructive">
              {logoutMutation.error instanceof Error
                ? logoutMutation.error.message
                : "Unable to log out right now."}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={logoutMutation.isPending}>No</AlertDialogCancel>
            <AlertDialogAction
              disabled={logoutMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void logoutMutation.mutateAsync();
              }}
            >
              {logoutMutation.isPending ? "Logging out..." : "Yes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
