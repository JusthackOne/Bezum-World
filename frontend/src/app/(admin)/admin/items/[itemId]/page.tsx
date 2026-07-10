import { AdminItemEditForm } from "@/features/admin-items/ui";
import { AppShell } from "@/widgets/layout/app-shell";

interface AdminItemEditPageProps {
  params: Promise<{
    itemId: string;
  }>;
}

export default async function AdminItemEditPage({ params }: AdminItemEditPageProps) {
  const { itemId } = await params;

  return (
    <AppShell>
      <AdminItemEditForm itemId={itemId} />
    </AppShell>
  );
}
