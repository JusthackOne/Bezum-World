"use client";

import { useState } from "react";
import {
  Building2Icon,
  Clock3Icon,
  CoinsIcon,
  CrosshairIcon,
  FootprintsIcon,
  HammerIcon,
  MapIcon,
  ShieldIcon,
  SwordsIcon,
  WrenchIcon,
  ZapIcon,
} from "lucide-react";

import type { CivilizationGameState, CivilizationPlayer } from "@/entities/civilization";
import { AvatarImage } from "@/shared/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/8bit";
import { useCountdown } from "@/shared/hooks";
import { formatDurationClock, formatMinutesDuration } from "@/shared/lib/date-time";
import { formatNumber } from "@/shared/lib/number-format";

type GuideTab = "energy" | "gold";

interface EnergyCost {
  label: string;
  units: number;
  icon: typeof ZapIcon;
  disabled?: boolean;
}

function CivilizationEconomyGuide({ state }: { state: CivilizationGameState }) {
  const [activeTab, setActiveTab] = useState<GuideTab>("energy");
  const { settings } = state.game;
  const energyCosts: EnergyCost[] = [
    { label: "Move on allied field", units: settings.costs.ownedMoveUnits, icon: FootprintsIcon },
    { label: "Capture another field", units: settings.costs.otherMoveUnits, icon: MapIcon },
    { label: "Attack player", units: settings.costs.attackPlayerUnits, icon: SwordsIcon },
    {
      label: "Capture building",
      units: settings.costs.buildingCaptureUnits,
      icon: Building2Icon,
    },
    { label: "Build tower", units: settings.costs.towerBuildUnits, icon: HammerIcon },
    {
      label: "Fire Catapult",
      units: settings.catapult.actionPointUnits,
      icon: CrosshairIcon,
      disabled: !settings.catapult.enabled,
    },
    {
      label: "Use Repair Kit",
      units: settings.costs.towerRepairUnits,
      icon: WrenchIcon,
      disabled: !settings.repairKit.enabled,
    },
  ];
  const regenerationPoints = settings.actionPoints.regenerationUnits / 2;

  return (
    <section className="border" aria-label="Game economy guide">
      <div className="grid grid-cols-2 border-b" role="tablist" aria-label="Economy guide">
        {([
          ["energy", "Energy", ZapIcon],
          ["gold", "Gold income", CoinsIcon],
        ] as const).map(([tab, label, Icon]) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`${tab}-guide-panel`}
              id={`${tab}-guide-tab`}
              className={`flex items-center justify-center gap-1.5 px-2 py-2 transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              <Icon className="size-3" />
              {label}
            </button>
          );
        })}
      </div>

      {activeTab === "energy" ? (
        <div
          id="energy-guide-panel"
          role="tabpanel"
          aria-labelledby="energy-guide-tab"
          className="space-y-2 p-2"
        >
          <div className="space-y-1">
            {energyCosts.map((cost) => {
              const Icon = cost.icon;
              return (
                <div
                  key={cost.label}
                  className="flex items-center justify-between gap-2 bg-muted/40 px-2 py-1.5"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <Icon className="size-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{cost.label}</span>
                    {cost.disabled ? (
                      <span className="text-[8px] text-muted-foreground">disabled</span>
                    ) : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-cyan-300">
                    <ZapIcon className="size-3" /> {cost.units / 2} AP
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 border border-cyan-400/30 bg-cyan-500/10 p-2 text-cyan-100">
            <Clock3Icon className="size-4 shrink-0 text-cyan-300" />
            <p>
              Restores <span className="text-cyan-300">+{regenerationPoints} AP</span> every{" "}
              {formatMinutesDuration(settings.actionPoints.regenerationIntervalMinutes)}, up to{" "}
              {settings.actionPoints.maximumUnits / 2} AP.
            </p>
          </div>
        </div>
      ) : (
        <div
          id="gold-guide-panel"
          role="tabpanel"
          aria-labelledby="gold-guide-tab"
          className="space-y-2 p-2"
        >
          <div className="flex items-center justify-between gap-3 bg-muted/40 p-2">
            <span className="flex items-center gap-2">
              <MapIcon className="size-4 text-amber-300" /> Connected captured field
            </span>
            <span className="shrink-0 text-amber-300">
              +{formatNumber(settings.territoryGoldPerHour)} G/h
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 bg-muted/40 p-2">
            <span className="flex items-center gap-2">
              <Building2Icon className="size-4 text-amber-300" /> Connected Gold Building
            </span>
            <span className="shrink-0 text-amber-300">
              +{formatNumber(settings.goldBuildingIncomePerHour)} G/h
            </span>
          </div>
          <p className="px-1 text-[9px] leading-relaxed text-muted-foreground">
            Income is added to the team treasury while the territory stays connected to your Town
            Hall.
          </p>
        </div>
      )}
    </section>
  );
}

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
        <CivilizationEconomyGuide state={state} />
      </CardContent>
    </Card>
  );
}
