import { SidebarInset } from "@/shared/ui/sidebar";
import { Header } from "@/widgets/layout/header/header";
import { AdminSidebar } from "@/widgets/layout/sidebar/admin-sidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <AdminSidebar />
      <SidebarInset>
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
