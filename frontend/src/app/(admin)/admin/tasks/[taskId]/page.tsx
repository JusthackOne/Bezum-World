import { AdminTaskEditForm } from "@/features/admin-tasks/ui";
import { AppShell } from "@/widgets/layout/app-shell";

interface AdminTaskEditPageProps {
  params: Promise<{
    taskId: string;
  }>;
}

export default async function AdminTaskEditPage({ params }: AdminTaskEditPageProps) {
  const { taskId } = await params;

  return (
    <AppShell>
      <AdminTaskEditForm taskId={taskId} />
    </AppShell>
  );
}
