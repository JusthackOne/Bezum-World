import { BossBattleEdit } from "@/features/admin-boss-battles/ui";
import { AppShell } from "@/widgets/layout/app-shell";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <AppShell>
      <BossBattleEdit id={id} />
    </AppShell>
  );
}
