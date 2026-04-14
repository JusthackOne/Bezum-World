import { AdminUserEditForm } from "@/features/admin-users/ui";
import { AppShell } from "@/widgets/layout/app-shell";

interface AdminUserEditPageProps {
  params: Promise<{
    userId: string;
  }>;
}

export default async function AdminUserEditPage({ params }: AdminUserEditPageProps) {
  const { userId } = await params;

  return (
    <AppShell>
      <AdminUserEditForm userId={userId} />
    </AppShell>
  );
}
