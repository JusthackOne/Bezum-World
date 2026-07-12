"use client";
import { useAdminBossBattleQuery } from "../api";
import { BossBattleForm } from "./boss-battle-form";
import { Card, CardContent } from "@/shared/ui/8bit";
export function BossBattleEdit({ id }: { id: string }) {
  const q = useAdminBossBattleQuery(id);
  if (q.isPending)
    return (
      <Card>
        <CardContent className="p-6">Loading boss battle...</CardContent>
      </Card>
    );
  if (q.isError)
    return (
      <Card>
        <CardContent className="p-6 text-destructive">{q.error.message}</CardContent>
      </Card>
    );
  return <BossBattleForm battle={q.data} />;
}
