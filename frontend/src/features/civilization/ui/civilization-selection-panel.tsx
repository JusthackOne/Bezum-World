"use client";

import { CoinsIcon, MapPinIcon, ShieldIcon, UserIcon, ZapIcon } from "lucide-react";

import type { CivilizationGameState, CivilizationLegalAction } from "@/entities/civilization";
import { formatNumber } from "@/shared/lib/number-format";
import { AvatarImage } from "@/shared/ui";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/8bit";

import { coordinateKey } from "../model/hex-grid";

function isActionForSelection(
  action: CivilizationLegalAction,
  state: CivilizationGameState,
  selectedTileId: string | null,
  selectedPlayerId: string | null,
): boolean {
  if (selectedPlayerId && action.targetPlayerId === selectedPlayerId) {
    return true;
  }
  const tile = state.tiles.find((item) => item.id === selectedTileId);
  if (!tile) {
    return false;
  }
  if (
    action.targetCoordinate &&
    coordinateKey(action.targetCoordinate) === coordinateKey(tile.coordinate)
  ) {
    return true;
  }
  const building = state.buildings.find((item) => item.tileId === tile.id);
  const tower = state.towers.find((item) => item.tileId === tile.id && item.status !== "CANCELLED");
  return action.buildingId === building?.id || action.towerId === tower?.id;
}

export function CivilizationSelectionPanel({
  state,
  selectedTileId,
  selectedPlayerId,
  onAction,
  isPending,
}: {
  state: CivilizationGameState;
  selectedTileId: string | null;
  selectedPlayerId: string | null;
  onAction: (action: CivilizationLegalAction) => void;
  isPending: boolean;
}) {
  const tile = state.tiles.find((item) => item.id === selectedTileId) ?? null;
  const player = state.players.find((item) => item.id === selectedPlayerId) ?? null;
  const building = tile ? (state.buildings.find((item) => item.tileId === tile.id) ?? null) : null;
  const tower = tile
    ? (state.towers.find((item) => item.tileId === tile.id && item.status !== "CANCELLED") ?? null)
    : null;
  const owner = tile?.ownerTeamId
    ? (state.teams.find((item) => item.id === tile.ownerTeamId) ?? null)
    : null;
  const actions = state.availableActions.filter((action) =>
    isActionForSelection(action, state, selectedTileId, selectedPlayerId),
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Selection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-[10px]">
        {!tile && !player ? (
          <p className="text-muted-foreground">
            Select a hex or player to inspect it and see server-approved actions.
          </p>
        ) : null}

        {tile ? (
          <div className="space-y-2 border p-3">
            <p className="flex items-center gap-1 text-xs">
              <MapPinIcon className="size-3" /> Hex {tile.coordinate.q}, {tile.coordinate.r}
            </p>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <span>Terrain</span>
              <span className="text-right text-foreground">{tile.terrainType}</span>
              <span>Owner</span>
              <span className="text-right" style={{ color: owner?.color }}>
                {owner?.name ?? "Neutral"}
              </span>
              <span>Productive</span>
              <span className="text-right text-foreground">{tile.isConnected ? "Yes" : "No"}</span>
            </div>
            {building ? (
              <div className="border-t pt-2 text-muted-foreground">
                <p>
                  Building: <span className="text-foreground">{building.type}</span>
                  {building.attributeKey ? ` · ${building.attributeKey}` : ""}
                </p>
                {building.type === "TOWN_HALL" ? (
                  <p
                    className={
                      building.status === "CAPTURED" ? "mt-1 text-red-300" : "mt-1 text-foreground"
                    }
                  >
                    Status: {building.status}
                  </p>
                ) : null}
              </div>
            ) : null}
            {tower ? (
              <p className="flex items-center gap-1 border-t pt-2 text-muted-foreground">
                <ShieldIcon className="size-3" /> Tower {tower.status}
                {tower.workKind ? ` (${tower.workKind.toLowerCase()})` : ""} · radius{" "}
                {tower.protectionRadius}
              </p>
            ) : null}
          </div>
        ) : null}

        {player ? (
          <div className="space-y-3 border p-3">
            <div className="flex items-center gap-3">
              <AvatarImage
                avatarUrl={player.avatarUrl}
                alt={`${player.username} avatar`}
                sizeClassName="size-10"
              />
              <div className="min-w-0">
                <p className="flex items-center gap-1 truncate text-xs">
                  <UserIcon className="size-3" /> {player.username}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {player.actionPointUnits / 2} AP ·{" "}
                  {state.teams.find((team) => team.id === player.teamId)?.name}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-t pt-2 text-muted-foreground">
              <div className="flex justify-between gap-2">
                <dt>Actions</dt>
                <dd className="text-foreground">{player.statistics.actionsUsed}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Cells</dt>
                <dd className="text-foreground">{player.statistics.cellsCaptured}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Attacks W/L</dt>
                <dd className="text-foreground">
                  {player.statistics.successfulPlayerAttacks}/
                  {player.statistics.failedPlayerAttacks}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Buildings</dt>
                <dd className="text-foreground">{player.statistics.buildingsCaptured}</dd>
              </div>
              <div className="col-span-2 flex justify-between gap-2">
                <dt>Gold spent</dt>
                <dd className="text-foreground">{formatNumber(player.statistics.goldSpent)}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        {actions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-muted-foreground">Available actions</p>
            {actions.map((action, index) => (
              <Button
                key={`${action.type}:${action.targetPlayerId ?? action.buildingId ?? action.towerId ?? index}`}
                type="button"
                className="h-auto w-full justify-between gap-3 py-2 text-left"
                disabled={isPending || Boolean(action.disabledReason)}
                title={action.disabledReason ?? undefined}
                onClick={() => onAction(action)}
              >
                <span className="min-w-0">
                  <span className="block">{action.label}</span>
                  {action.disabledReason ? (
                    <span className="mt-1 block text-[8px] font-normal text-muted-foreground">
                      {action.disabledReason.toLowerCase().replaceAll("_", " ")}
                    </span>
                  ) : null}
                </span>
                <span className="flex shrink-0 items-center gap-2 text-[9px]">
                  <span className="flex items-center gap-1">
                    <ZapIcon className="size-3" /> {action.actionPointUnits / 2}
                  </span>
                  {Number(action.goldCost) > 0 ? (
                    <span className="flex items-center gap-1">
                      <CoinsIcon className="size-3" /> {action.goldCost}
                    </span>
                  ) : null}
                </span>
              </Button>
            ))}
          </div>
        ) : tile || player ? (
          <p className="text-muted-foreground">No action is currently available for this target.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
