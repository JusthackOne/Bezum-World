"use client";

import { Clock3Icon, ShieldIcon, ZapIcon } from "lucide-react";

import type { CivilizationGameState, CivilizationPlayer } from "@/entities/civilization";
import { AvatarImage } from "@/shared/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/8bit";
import { useCountdown } from "@/shared/hooks";
import { formatDurationClock } from "@/shared/lib/date-time";
import { formatNumber } from "@/shared/lib/number-format";

export function CivilizationPlayerPanel({
  player,
  state,
}: {
  player: CivilizationPlayer | null;
  state: CivilizationGameState;
}) {
  const nextPointRemaining = useCountdown(player?.nextActionPointAt ?? null, state.serverTime);
  const nextPoint =
    nextPointRemaining === null ? "At maximum" : formatDurationClock(nextPointRemaining);

  if (!player) {
    return (
      <Card>
        <CardContent className="p-4 text-xs text-muted-foreground">
          You are watching this game as a spectator. Gameplay actions are disabled.
        </CardContent>
      </Card>
    );
  }

  const team = state.teams.find((item) => item.id === player.teamId);
  const towerActions =
    player.statistics.towerConstructionsStarted +
    player.statistics.towersDestroyed +
    player.statistics.towersRepaired;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-sm">
          <AvatarImage
            avatarUrl={player.avatarUrl}
            alt={`${player.username} avatar`}
            sizeClassName="size-10"
            className="border-2"
          />
          <span className="min-w-0">
            <span className="block truncate">{player.username}</span>
            <span className="mt-1 block text-[9px] text-muted-foreground">Current player</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-[10px]">
        <div className="flex items-center justify-between gap-2 border p-2">
          <span className="flex items-center gap-1 text-muted-foreground">
            <ZapIcon className="size-3 text-amber-300" /> Action points
          </span>
          <span className="text-amber-300">
            {player.actionPointUnits / 2}/{player.maximumActionPointUnits / 2}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 border p-2">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock3Icon className="size-3" /> Next point
          </span>
          <span>{nextPoint}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border p-2">
          <span className="flex items-center gap-1 text-muted-foreground">
            <ShieldIcon className="size-3" /> Team
          </span>
          <span style={{ color: team?.color }}>{team?.name ?? "Unknown"}</span>
        </div>
        <div className="border p-2">
          <p className="mb-2 text-muted-foreground">Player statistics</p>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div className="flex justify-between gap-2">
              <dt>Actions</dt>
              <dd>{player.statistics.actionsUsed}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Cells</dt>
              <dd>{player.statistics.cellsCaptured}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Attacks W/L</dt>
              <dd>
                {player.statistics.successfulPlayerAttacks}/{player.statistics.failedPlayerAttacks}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Buildings</dt>
              <dd>{player.statistics.buildingsCaptured}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Tower actions</dt>
              <dd>{towerActions}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt>Town hall</dt>
              <dd>
                {player.statistics.townHallContributions}/{player.statistics.townHallDefenses}
              </dd>
            </div>
            <div className="col-span-2 flex justify-between gap-2 border-t pt-1">
              <dt>Team gold spent</dt>
              <dd>{formatNumber(player.statistics.goldSpent)}</dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
