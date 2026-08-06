import { CivilizationGameEdit } from "@/features/admin-civilization/ui";
import { AppShell } from "@/widgets/layout/app-shell";

export default async function EditCivilizationPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return (
    <AppShell>
      <CivilizationGameEdit gameId={gameId} />
    </AppShell>
  );
}
