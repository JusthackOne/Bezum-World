import { AdminTasksDataTable } from "@/features/admin-tasks/ui";
import { AppShell } from "@/widgets/layout/app-shell";

export default function AdminTasksPage() {
  return (
    <AppShell>
      <AdminTasksDataTable />
    </AppShell>
  );
}
