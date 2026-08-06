"use client";

import { usePathname } from "next/navigation";

import { cn } from "@/shared/lib/utils";
import { SidebarInset } from "@/shared/ui";
import { ClientHeader } from "@/widgets/layout/header/client-header";
import { ClientSidebar } from "@/widgets/layout/sidebar/client-sidebar";

interface ClientAppShellProps {
  children: React.ReactNode;
}

export function ClientAppShell({ children }: ClientAppShellProps) {
  const pathname = usePathname();
  const isFullWidth = pathname.startsWith("/civilization");
  return (
    <>
      <ClientSidebar />
      <SidebarInset>
        <ClientHeader />
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
