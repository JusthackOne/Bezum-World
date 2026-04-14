import { AdminItemEditForm } from "@/features/admin-items/ui";
import { AppShell } from "@/widgets/layout/app-shell";

interface AdminItemEditPageProps {
  params: {
    itemId: string;
  };
}

export default function AdminItemEditPage({ params }: AdminItemEditPageProps) {
  return (
    <AppShell>
      <AdminItemEditForm itemId={params.itemId} />
    </AppShell>
  );
}
