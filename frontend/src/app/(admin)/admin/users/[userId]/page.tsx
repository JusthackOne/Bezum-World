import { AdminUserEditForm } from "@/features/admin-users/ui";
import { AppShell } from "@/widgets/layout/app-shell";

interface AdminUserEditPageProps {
  params: {
    userId: string;
  };
}

export default function AdminUserEditPage({ params }: AdminUserEditPageProps) {
  return (
    <AppShell>
      <AdminUserEditForm userId={params.userId} />
    </AppShell>
  );
}
