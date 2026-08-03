import { CivilizationGameDetails } from "@/features/admin-civilization/ui";
import { AppShell } from "@/widgets/layout/app-shell";

export default async function AdminCivilizationDetailsPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return (
    <AppShell>
      <CivilizationGameDetails gameId={gameId} />
    </AppShell>
  );
}
