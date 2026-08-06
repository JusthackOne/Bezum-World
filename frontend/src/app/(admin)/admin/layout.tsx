import { AdminPanelGuard } from "@/features/auth/ui";
import { SidebarProvider } from "@/shared/ui";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SidebarProvider>
      <AdminPanelGuard>{children}</AdminPanelGuard>
    </SidebarProvider>
  );
}
