import { BossBattlePage } from "@/features/boss-battle/ui";

export default async function HistoricalBossBattlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BossBattlePage battleId={id} />;
}
