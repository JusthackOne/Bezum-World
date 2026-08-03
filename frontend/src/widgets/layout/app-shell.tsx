"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/utils";
import { SidebarInset } from "@/shared/ui";
import { Header } from "@/widgets/layout/header/header";
import { AdminSidebar } from "@/widgets/layout/sidebar/admin-sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isFullWidth = pathname.startsWith("/admin/civilization");
  return (
    <>
      <AdminSidebar />
      <SidebarInset>
        <Header />
        <main
          className={cn(
            "mx-auto w-full flex-1 p-4 md:p-8",
            isFullWidth ? "max-w-none" : "max-w-6xl",
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
