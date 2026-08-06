"use client";

import Link from "next/link";
import { HistoryIcon, RefreshCwIcon } from "lucide-react";

import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/shared/ui/8bit";

import { useCurrentCivilizationGameQuery } from "../api";
import { civilizationRoutes } from "../routes";
import { CivilizationGameView } from "./civilization-game-view";

export function CivilizationCurrentPage() {
  const query = useCurrentCivilizationGameQuery();

  if (query.isPending) {
    return <Skeleton className="min-h-130 w-full" />;
  }

  if (query.isError) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <p className="text-sm text-destructive">{query.error.message}</p>
          <Button type="button" variant="outline" onClick={() => query.refetch()}>
            <RefreshCwIcon className="size-4" /> Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!query.data) {
    return (
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>No Civilization games yet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-xs text-muted-foreground">
          <p>There is no active, scheduled, or completed Civilization game available to view.</p>
          <Button asChild variant="outline">
            <Link href={civilizationRoutes.history}>
              <HistoryIcon className="size-4" /> Open game history
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <CivilizationGameView
      gameId={query.data.id}
      isHistorical={query.data.status === "COMPLETED" || query.data.status === "CANCELLED"}
    />
  );
}
