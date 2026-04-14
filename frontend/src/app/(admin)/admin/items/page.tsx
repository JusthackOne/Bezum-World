import { AdminItemsDataTable } from "@/features/admin-items/ui";
import { AppShell } from "@/widgets/layout/app-shell";

export default function AdminItemsPage() {
  return (
    <AppShell>
      <AdminItemsDataTable />
    </AppShell>
  );
}
