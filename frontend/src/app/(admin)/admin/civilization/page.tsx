import { CivilizationGamesTable } from "@/features/admin-civilization/ui";
import { AppShell } from "@/widgets/layout/app-shell";

export default function AdminCivilizationPage() {
  return (
    <AppShell>
      <CivilizationGamesTable />
    </AppShell>
  );
}
