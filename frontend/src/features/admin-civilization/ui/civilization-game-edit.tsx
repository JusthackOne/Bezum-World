"use client";

import { useAdminCivilizationGameQuery } from "../api";
import { CivilizationGameForm } from "./civilization-game-form";
import { Card, CardContent, Skeleton } from "@/shared/ui/8bit";

export function CivilizationGameEdit({ gameId }: { gameId: string }) {
  const query = useAdminCivilizationGameQuery(gameId);
  if (query.isPending) return <Skeleton className="min-h-96 w-full" />;
  if (query.isError)
    return (
      <Card>
        <CardContent className="p-6 text-xs text-destructive">{query.error.message}</CardContent>
      </Card>
    );
  return <CivilizationGameForm game={query.data} />;
}
