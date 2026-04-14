import { AdminTaskEditForm } from "@/features/admin-tasks/ui";
import { AppShell } from "@/widgets/layout/app-shell";

interface AdminTaskEditPageProps {
  params: {
    taskId: string;
  };
}

export default function AdminTaskEditPage({ params }: AdminTaskEditPageProps) {
  return (
    <AppShell>
      <AdminTaskEditForm taskId={params.taskId} />
    </AppShell>
  );
}
