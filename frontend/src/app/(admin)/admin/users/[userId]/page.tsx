import { AdminUserEditStub } from "@/features/admin-users/ui";
import { AppShell } from "@/widgets/layout/app-shell";

interface AdminUserEditPageProps {
  params: {
    userId: string;
  };
}

export default function AdminUserEditPage({ params }: AdminUserEditPageProps) {
  return (
    <AppShell>
      <AdminUserEditStub userId={params.userId} />
    </AppShell>
  );
}
