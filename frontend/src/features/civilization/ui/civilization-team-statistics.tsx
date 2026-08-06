import { CoinsIcon, MapIcon, ShieldIcon, SparklesIcon, TrophyIcon } from "lucide-react";

import { CIVILIZATION_ATTRIBUTE_KEYS, type CivilizationTeamState } from "@/entities/civilization";
import { formatNumber } from "@/shared/lib/number-format";
import { cn } from "@/shared/lib/utils";
import { attributeVisuals } from "@/shared/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/8bit";

export function CivilizationTeamStatistics({ team }: { team: CivilizationTeamState }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: team.color }} />
      <CardHeader className="pb-3">
        <CardTitle className="truncate text-sm">{team.name}</CardTitle>
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
          <div className="grid grid-cols-2 gap-2">
            {CIVILIZATION_ATTRIBUTE_KEYS.map((key) => {
              const visual = attributeVisuals[key];
              const Icon = visual.icon;
              return (
                <div
                  key={key}
                  className={cn(
                    "flex items-center gap-2 border px-2 py-1.5",
                    visual.accentClassName,
                  )}
                  aria-label={`${visual.label}: ${formatNumber(
                    team.attributeAmounts[key],
                  )}, +${formatNumber(team.attributeIncomePerHour[key])} per hour`}
                  title={visual.label}
                >
                  <Icon className={cn("size-4 shrink-0", visual.iconClassName)} />
                  <span className="min-w-0 text-xs font-semibold tabular-nums">
                    {formatNumber(team.attributeAmounts[key])}
                  </span>
                  <span className="ml-auto text-[9px] text-muted-foreground tabular-nums">
                    +{formatNumber(team.attributeIncomePerHour[key])}/h
                  </span>
                </div>
              );
            })}
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
