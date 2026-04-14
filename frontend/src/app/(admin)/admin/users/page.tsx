import { AdminUsersDataTable } from "@/features/admin-users/ui";
import { AppShell } from "@/widgets/layout/app-shell";

export default function AdminUsersPage() {
  return (
    <AppShell>
      <AdminUsersDataTable />
    </AppShell>
  );
}
