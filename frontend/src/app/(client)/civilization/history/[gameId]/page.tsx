import { CivilizationGameView } from "@/features/civilization/ui";

export default async function CivilizationHistoryDetailsRoute({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  return <CivilizationGameView gameId={gameId} isHistorical />;
}
