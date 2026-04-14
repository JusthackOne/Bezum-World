"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListTodoIcon, ShoppingBagIcon, TrophyIcon } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/shared/ui/sidebar";

export function ClientSidebar() {
  const pathname = usePathname();
  const isShopActive = pathname.startsWith("/shop");
  const isTasksActive = pathname.startsWith("/tasks");
  const isLeaderboardActive = pathname.startsWith("/leaderboard");

  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isShopActive}>
                <Link href="/shop">
                  <ShoppingBagIcon />
                  <span>Shop</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isTasksActive}>
                <Link href="/tasks">
                  <ListTodoIcon />
                  <span>Tasks</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isLeaderboardActive}>
                <Link href="/leaderboard">
                  <TrophyIcon />
                  <span>LeaderBoard</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}
