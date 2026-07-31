import { CoinsIcon, MapIcon, ShieldIcon, SparklesIcon, TrophyIcon } from "lucide-react";

import { CIVILIZATION_ATTRIBUTE_KEYS, type CivilizationTeamState } from "@/entities/civilization";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/8bit";
import { formatNumber } from "@/shared/lib/number-format";

function attributeLabel(key: string): string {
  return key.slice(0, 1).toUpperCase() + key.slice(1);
}

export function CivilizationTeamStatistics({ team }: { team: CivilizationTeamState }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: team.color }} />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-sm">
          <span className="truncate">{team.name}</span>
          <span className="text-[10px] text-muted-foreground">{team.side}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="border bg-amber-500/10 p-2">
            <p className="flex items-center gap-1 text-muted-foreground">
              <CoinsIcon className="size-3" /> Gold
            </p>
            <p className="mt-1 text-sm text-amber-300">{formatNumber(team.goldAmount)}</p>
            <p className="mt-1 text-[9px] text-muted-foreground">
              +{formatNumber(team.goldIncomePerHour)}/h
            </p>
          </div>
          <div className="border bg-violet-500/10 p-2">
            <p className="flex items-center gap-1 text-muted-foreground">
              <TrophyIcon className="size-3" /> Score
            </p>
            <p className="mt-1 text-sm text-violet-300">{formatNumber(team.estimatedScore)}</p>
            <p className="mt-1 text-[9px] text-muted-foreground">
              {team.totalActionPointUnits / 2} total AP
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-1 text-muted-foreground">
            <SparklesIcon className="size-3" /> Attribute pools
          </p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {CIVILIZATION_ATTRIBUTE_KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between gap-2">
                <span className="truncate text-[9px] text-muted-foreground">
                  {attributeLabel(key)}
                </span>
                <span className="text-[9px]">
                  {formatNumber(team.attributeAmounts[key])}
                  <span className="text-muted-foreground">
                    {` (+${formatNumber(team.attributeIncomePerHour[key])}/h)`}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="border p-2">
            <MapIcon className="mx-auto size-3 text-emerald-300" />
            <p className="mt-1">{team.connectedCellCount}</p>
            <p className="mt-1 text-[8px] text-muted-foreground">connected</p>
          </div>
          <div className="border p-2">
            <MapIcon className="mx-auto size-3 text-slate-400" />
            <p className="mt-1">{team.disconnectedCellCount}</p>
            <p className="mt-1 text-[8px] text-muted-foreground">disconnected</p>
          </div>
          <div className="border p-2">
            <ShieldIcon className="mx-auto size-3 text-blue-300" />
            <p className="mt-1">{team.activeTowerCount}</p>
            <p className="mt-1 text-[8px] text-muted-foreground">towers</p>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>Town hall pressure</span>
            <span>
              {team.townHallCaptureProgress / 2}/{team.townHallCaptureRequired / 2}
            </span>
          </div>
          <div className="h-2 overflow-hidden border bg-slate-900">
            <div
              className="h-full bg-red-500 transition-[width]"
              style={{
                width: `${Math.min(
                  100,
                  (team.townHallCaptureProgress / Math.max(1, team.townHallCaptureRequired)) * 100,
                )}%`,
              }}
            />
          </div>
          <p className="text-[9px] text-muted-foreground">
            {team.ownedCellCount} cells · {team.controlledBuildingCount} buildings
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
