import { SidebarInset } from "@/shared/ui";
import { ClientHeader } from "@/widgets/layout/header/client-header";
import { ClientSidebar } from "@/widgets/layout/sidebar/client-sidebar";

interface ClientAppShellProps {
  children: React.ReactNode;
}

export function ClientAppShell({ children }: ClientAppShellProps) {
  return (
    <>
      <ClientSidebar />
      <SidebarInset>
        <ClientHeader />
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
