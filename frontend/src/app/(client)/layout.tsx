"use client";

import { usePathname } from "next/navigation";

import { ClientPanelGuard } from "@/features/auth/ui";
import { SidebarProvider } from "@/shared/ui";
import { ClientAppShell } from "@/widgets/layout/client-app-shell";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <SidebarProvider>
      <ClientPanelGuard>
        {isLoginPage ? children : <ClientAppShell>{children}</ClientAppShell>}
      </ClientPanelGuard>
    </SidebarProvider>
  );
}
