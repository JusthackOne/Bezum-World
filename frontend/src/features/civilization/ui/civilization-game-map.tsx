"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Application,
  Container,
  FederatedPointerEvent,
  Graphics,
  Sprite,
  Text,
  Texture,
} from "pixi.js";
import { Viewport } from "pixi-viewport";
import {
  CheckIcon,
  CoinsIcon,
  LocateFixedIcon,
  MinusIcon,
  PlusIcon,
  TrophyIcon,
  ZapIcon,
  XIcon,
} from "lucide-react";

import {
  CIVILIZATION_ASSETS,
  type CivilizationActionType,
  type CivilizationAssetKey,
  type CivilizationBuilding,
  type CivilizationGameState,
  type CivilizationPlayer,
} from "@/entities/civilization";
import { formatDateTime } from "@/shared/lib/date-time";
import { formatNumber } from "@/shared/lib/number-format";
import { cn } from "@/shared/lib/utils";
import { clearPixiContainer, safelyLoadPixiTexture } from "@/shared/lib/pixi";
import { Button } from "@/shared/ui/8bit";

import {
  CIVILIZATION_HEX_RADIUS,
  coordinateKey,
  createHexLayout,
  hexDistance,
} from "../model/hex-grid";

interface CivilizationGameMapProps {
  state: CivilizationGameState;
  selectedTileId: string | null;
  selectedPlayerId: string | null;
  selectedTowerId: string | null;
  placementMode: "BUILD_TOWER" | "CATAPULT_ATTACK" | "REPAIR_TOWER" | null;
  placementTileId: string | null;
  isInteractionDisabled?: boolean;
  onSelectTile: (tileId: string) => void;
  onSelectPlayer: (playerId: string) => void;
  onCancelSelection: () => void;
  onToggleTowerPlacement: () => void;
  onToggleCatapult: () => void;
  onToggleRepairKit: () => void;
  onCancelPlacement: () => void;
  onCancelPlacementPreview: () => void;
  onConfirmPlacement: () => void;
  className?: string;
}

interface SceneLayers {
  terrain: Container;
  territory: Container;
  connectivity: Container;
  spawns: Container;
  buildings: Container;
  towerProtection: Container;
  players: Container;
  legalActions: Container;
  selection: Container;
  effects: Container;
}

interface PixiScene {
  app: Application;
  viewport: Viewport;
  layers: SceneLayers;
  hasCentered: boolean;
  renderVersion: number;
  staticMapRenderVersion: number;
  renderedStaticMapFingerprint: string | null;
  renderedStateVersion: number | null;
  renderedInteractionDisabled: boolean;
  tileCenters: Map<string, { x: number; y: number }>;
  terrainTileGraphics: Map<string, Graphics>;
  playerCenters: Map<string, { x: number; y: number }>;
}

interface StructureTooltipTarget {
  kind: "building" | "tower";
  id: string;
}

interface StructureTooltipState extends StructureTooltipTarget {
  x: number;
  y: number;
  isPinned: boolean;
}

type ShowStructureTooltip = (
  target: StructureTooltipTarget,
  event: FederatedPointerEvent,
  isPinned: boolean,
) => void;

type HideStructureTooltip = (target: StructureTooltipTarget) => void;

const FALLBACK_TEAM_COLORS = ["#6366f1", "#f43f5e"] as const;
const MINIMUM_MAP_ZOOM = 0.08;
const MAXIMUM_MAP_ZOOM = 2.4;
const MAP_ZOOM_STEP = 0.18;
const STRUCTURE_TOOLTIP_WIDTH = 256;
const MAP_STRUCTURE_SPRITE_SIZE = CIVILIZATION_HEX_RADIUS * 2;

const BUILDING_PLACEMENT_CONTROLS = [
  {
    actionType: "BUILD_TOWER" as const,
    label: "Place defensive tower",
    asset: CIVILIZATION_ASSETS["tower.active"],
  },
];

function parseColor(color: string | undefined, fallback: string): string {
  return color && /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function buildingAssetKey(building: CivilizationBuilding): CivilizationAssetKey {
  if (building.type === "TOWN_HALL") {
    return "townHall";
  }
  if (building.type === "GOLD_BUILDING") {
    return "goldBuilding";
  }
  return building.attributeKey ? `attributeBuilding.${building.attributeKey}` : "resource.neutral";
}

function buildingName(building: CivilizationBuilding): string {
  if (building.type === "TOWN_HALL") {
    return "Town Hall";
  }
  if (building.type === "GOLD_BUILDING") {
    return "Gold Mine";
  }
  const attribute = building.attributeKey
    ? `${building.attributeKey[0].toUpperCase()}${building.attributeKey.slice(1)}`
    : "Attribute";
  return `${attribute} Building`;
}

function statusLabel(status: string): string {
  return status.toLowerCase().replaceAll("_", " ");
}

function StructureTooltip({
  tooltip,
  state,
  mapWidth,
  mapHeight,
}: {
  tooltip: StructureTooltipState;
  state: CivilizationGameState;
  mapWidth: number;
  mapHeight: number;
}) {
  const building =
    tooltip.kind === "building"
      ? (state.buildings.find((item) => item.id === tooltip.id) ?? null)
      : null;
  const tower =
    tooltip.kind === "tower" ? (state.towers.find((item) => item.id === tooltip.id) ?? null) : null;
  const teamId = building?.ownerTeamId ?? tower?.teamId ?? null;
  const team = teamId ? (state.teams.find((item) => item.id === teamId) ?? null) : null;

  if (!building && !tower) {
    return null;
  }

  const rows: Array<{ label: string; value: string }> = [];

  if (building) {
    if (building.captureRequired > 0) {
      rows.push({
        label: "Capture progress",
        value: `${building.captureProgress / 2} / ${building.captureRequired / 2}`,
      });
    }
    if (building.capturingTeamId) {
      const capturingTeam = state.teams.find((item) => item.id === building.capturingTeamId);
      if (capturingTeam) {
        rows.push({ label: "Capturing team", value: capturingTeam.name });
      }
    }
    rows.push({
      label: "Status",
      value:
        building.captureProgress > 0 && building.status !== "CAPTURED"
          ? "being captured"
          : statusLabel(building.status),
    });
    if (building.type === "GOLD_BUILDING") {
      rows.push({ label: "Production", value: `${building.incomePerHour} gold / hour` });
      if (team) {
        rows.push({ label: "Team gold", value: team.goldAmount });
      }
    }
    if (building.type === "ATTRIBUTE_BUILDING" && building.attributeKey) {
      rows.push({
        label: "Production",
        value: `${building.incomePerHour} ${building.attributeKey} / hour`,
      });
      if (team) {
        rows.push({
          label: "Team resource",
          value: team.attributeAmounts[building.attributeKey],
        });
      }
    }
  }

  if (tower) {
    rows.push({
      label: "Status",
      value: tower.status === "DESTROYED" ? "destroyed / damaged" : statusLabel(tower.status),
    });
    rows.push({
      label: "Destruction progress",
      value: `${tower.destructionProgressActions} / ${tower.destructionRequiredActions}`,
    });
    if (tower.status === "UNDER_CONSTRUCTION" && tower.constructionCompletesAt) {
      const startedAt = new Date(tower.constructionStartedAt).getTime();
      const completesAt = new Date(tower.constructionCompletesAt).getTime();
      const serverTime = new Date(state.serverTime).getTime();
      const requiredMinutes = Math.max(0, Math.ceil((completesAt - startedAt) / 60_000));
      const progressMinutes = Math.min(
        requiredMinutes,
        Math.max(0, Math.floor((serverTime - startedAt) / 60_000)),
      );
      rows.push({
        label: tower.workKind === "REPAIR" ? "Repair progress" : "Construction progress",
        value: `${progressMinutes} / ${requiredMinutes} min`,
      });
    }
    if (tower.workKind) {
      rows.push({ label: "Current work", value: statusLabel(tower.workKind) });
    }
    if (tower.constructionCompletesAt) {
      rows.push({ label: "Completes", value: formatDateTime(tower.constructionCompletesAt) });
    }
  }

  const mobile = mapWidth < 520;
  const width = Math.min(STRUCTURE_TOOLTIP_WIDTH, mapWidth - 16);
  const estimatedHeight = 230;
  const canPlaceRight = tooltip.x + width + 18 <= mapWidth - 8;
  const canPlaceLeft = tooltip.x - width - 18 >= 8;
  const left = mobile
    ? 8
    : canPlaceRight
      ? tooltip.x + 18
      : canPlaceLeft
        ? tooltip.x - width - 18
        : Math.max(8, Math.min(tooltip.x - width / 2, mapWidth - width - 8));
  const top = mobile
    ? Math.max(8, mapHeight - Math.min(estimatedHeight, mapHeight * 0.48) - 8)
    : tooltip.y + estimatedHeight <= mapHeight - 8
      ? tooltip.y + 12
      : Math.max(8, tooltip.y - estimatedHeight - 12);

  return (
    <div
      className="absolute z-20 overflow-x-hidden overflow-y-auto rounded-md border border-white/20 bg-slate-950/95 p-3 text-[11px] wrap-anywhere text-slate-100 shadow-xl backdrop-blur-sm"
      style={{
        left,
        top,
        width,
        maxHeight: Math.max(120, mapHeight - top - 8),
      }}
      role="tooltip"
      data-structure-tooltip
    >
      <p className="text-sm font-semibold">{building ? buildingName(building) : "Defense Tower"}</p>
      <dl className="mt-2 space-y-1.5">
        {rows.map((row) => (
          <div
            key={`${row.label}:${row.value}`}
            className="grid grid-cols-1 gap-x-3 sm:grid-cols-2"
          >
            <dt className="text-slate-400">{row.label}</dt>
            <dd className="min-w-0 wrap-break-word capitalize sm:text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function addPlayerToken(
  layer: Container,
  player: CivilizationPlayer,
  position: { x: number; y: number },
  teamColor: string,
  isCurrentPlayer: boolean,
  avatarTexture: Texture | null,
  onSelectPlayer: (playerId: string) => void,
  disabled: boolean,
  compact = false,
): void {
  const token = new Container();
  token.position.set(position.x, position.y);
  token.scale.set(compact ? 0.72 : 1);
  const isSelectable = !disabled;
  token.eventMode = isSelectable ? "static" : "none";
  token.cursor = isSelectable ? "pointer" : "default";
  token.on("pointertap", (event: FederatedPointerEvent) => {
    event.stopPropagation();
    onSelectPlayer(player.id);
  });

  const outline = new Graphics()
    .circle(0, 0, isCurrentPlayer ? 24 : 21)
    .fill({ color: isCurrentPlayer ? "#facc15" : teamColor, alpha: 1 });
  token.addChild(outline);

  if (avatarTexture) {
    const avatar = new Sprite(avatarTexture);
    avatar.anchor.set(0.5);
    avatar.width = 36;
    avatar.height = 36;
    const mask = new Graphics().circle(0, 0, 18).fill({ color: "#ffffff" });
    avatar.mask = mask;
    token.addChild(mask, avatar);
  } else {
    token.addChild(new Graphics().circle(0, 0, 18).fill({ color: "#1f2937" }));
    const initial = new Text({
      text: player.username.slice(0, 1).toUpperCase(),
      style: { fill: "#ffffff", fontFamily: "Arial", fontSize: 16, fontWeight: "700" },
    });
    initial.anchor.set(0.5);
    token.addChild(initial);
  }

  if (!compact) {
    const name = new Text({
      text: player.username,
      style: {
        fill: "#ffffff",
        fontFamily: "Arial",
        fontSize: 11,
        fontWeight: "700",
        stroke: { color: "#020617", width: 3 },
      },
    });
    name.anchor.set(0.5, 0);
    name.position.set(0, 23);
    token.addChild(name);
  }
  layer.addChild(token);
}

function playerTokenPosition(
  tileCenter: { x: number; y: number },
  stackIndex: number,
): { x: number; y: number } {
  const angle = -Math.PI / 2 + stackIndex * (Math.PI / 3);
  return {
    x: tileCenter.x + Math.cos(angle) * 27,
    y: tileCenter.y - 4 + Math.sin(angle) * 27,
  };
}

function createStaticMapFingerprint(state: CivilizationGameState): string {
  return JSON.stringify(
    state.tiles
      .map((tile) => [tile.id, tile.coordinate.q, tile.coordinate.r, tile.terrainType] as const)
      .sort(([leftId], [rightId]) => (leftId < rightId ? -1 : leftId > rightId ? 1 : 0)),
  );
}

function updateTerrainInteractions(scene: PixiScene, disabled: boolean): void {
  scene.terrainTileGraphics.forEach((terrain) => {
    terrain.eventMode = disabled ? "none" : "static";
    terrain.cursor = disabled ? "default" : "pointer";
  });
}

function clearDynamicLayers(scene: PixiScene): void {
  clearPixiContainer(scene.layers.territory);
  clearPixiContainer(scene.layers.connectivity);
  clearPixiContainer(scene.layers.spawns);
  clearPixiContainer(scene.layers.buildings);
  clearPixiContainer(scene.layers.towerProtection);
  clearPixiContainer(scene.layers.players);
  clearPixiContainer(scene.layers.legalActions);
  clearPixiContainer(scene.layers.selection);
}

function renderStaticMap(
  scene: PixiScene,
  state: CivilizationGameState,
  layout: ReturnType<typeof createHexLayout>,
  centers: Map<string, { x: number; y: number }>,
  fingerprint: string,
  onSelectTile: (tileId: string) => void,
  disabled: boolean,
): void {
  const staticMapRenderVersion = ++scene.staticMapRenderVersion;
  scene.renderedStaticMapFingerprint = fingerprint;
  scene.terrainTileGraphics.clear();
  clearPixiContainer(scene.layers.terrain);
  clearPixiContainer(scene.layers.effects);

  scene.viewport.resize(
    scene.app.renderer.screen.width,
    scene.app.renderer.screen.height,
    layout.width,
    layout.height,
  );

  state.tiles.forEach((tile) => {
    const layoutItem = layout.items.get(coordinateKey(tile.coordinate));
    if (!layoutItem) {
      return;
    }

    const baseFill = tile.terrainType === "MOUNTAIN" ? "#273449" : "#475569";
    const terrain = new Graphics()
      .poly(layoutItem.corners, true)
      .fill({ color: baseFill, alpha: 1 })
      .stroke({ color: "#0f172a", width: 2, alpha: 0.95 });
    terrain.eventMode = disabled ? "none" : "static";
    terrain.cursor = disabled ? "default" : "pointer";
    terrain.on("pointertap", (event: FederatedPointerEvent) => {
      event.stopPropagation();
      onSelectTile(tile.id);
    });
    scene.terrainTileGraphics.set(tile.id, terrain);
    scene.layers.terrain.addChild(terrain);

    const coordinateLabel = new Text({
      text: `${tile.coordinate.q},${tile.coordinate.r}`,
      style: { fill: "#cbd5e1", fontFamily: "Arial", fontSize: 9 },
    });
    coordinateLabel.anchor.set(0.5);
    coordinateLabel.position.set(layoutItem.center.x, layoutItem.center.y + 35);
    scene.layers.effects.addChild(coordinateLabel);
  });

  void safelyLoadPixiTexture(CIVILIZATION_ASSETS.mountain.path).then((mountainTexture) => {
    if (
      !mountainTexture ||
      staticMapRenderVersion !== scene.staticMapRenderVersion ||
      fingerprint !== scene.renderedStaticMapFingerprint
    ) {
      return;
    }

    state.tiles
      .filter((tile) => tile.terrainType === "MOUNTAIN")
      .forEach((tile) => {
        const center = centers.get(tile.id);
        if (!center) {
          return;
        }
        const sprite = new Sprite(mountainTexture);
        sprite.anchor.set(0.5);
        sprite.position.set(center.x, center.y - 4);
        sprite.width = MAP_STRUCTURE_SPRITE_SIZE;
        sprite.height = MAP_STRUCTURE_SPRITE_SIZE;
        scene.layers.terrain.addChild(sprite);
      });
  });
}

function addStructureInteraction(
  layer: Container,
  corners: Array<{ x: number; y: number }>,
  target: StructureTooltipTarget,
  tileId: string,
  onSelectTile: (tileId: string) => void,
  onShowTooltip: ShowStructureTooltip,
  onHideTooltip: HideStructureTooltip,
  disabled: boolean,
): void {
  const hitArea = new Graphics().poly(corners, true).fill({ color: "#ffffff", alpha: 0.001 });
  hitArea.eventMode = disabled ? "none" : "static";
  hitArea.cursor = disabled ? "default" : "pointer";
  hitArea.on("pointerover", (event: FederatedPointerEvent) => {
    if (event.pointerType === "mouse") {
      onShowTooltip(target, event, false);
    }
  });
  hitArea.on("pointerout", (event: FederatedPointerEvent) => {
    if (event.pointerType === "mouse") {
      onHideTooltip(target);
    }
  });
  hitArea.on("pointertap", (event: FederatedPointerEvent) => {
    event.stopPropagation();
    onSelectTile(tileId);
    if (event.pointerType !== "mouse") {
      onShowTooltip(target, event, true);
    }
  });
  layer.addChild(hitArea);
}

function addStructureProgressBadge(
  layer: Container,
  center: { x: number; y: number },
  value: string,
  accentColor: string,
): void {
  const badge = new Container();
  badge.position.set(center.x, center.y + 29);
  badge.addChild(
    new Graphics()
      .roundRect(-25, -10, 50, 20, 4)
      .fill({ color: "#020617", alpha: 0.94 })
      .stroke({ color: accentColor, width: 2 }),
  );
  const label = new Text({
    text: value,
    style: {
      fill: "#ffffff",
      fontFamily: "Arial",
      fontSize: 12,
      fontWeight: "700",
    },
  });
  label.anchor.set(0.5);
  badge.addChild(label);
  layer.addChild(badge);
}

async function renderBaseScene(
  scene: PixiScene,
  state: CivilizationGameState,
  onSelectTile: (tileId: string) => void,
  onSelectPlayer: (playerId: string) => void,
  onShowPlayerStack: (tileId: string) => void,
  onShowStructureTooltip: ShowStructureTooltip,
  onHideStructureTooltip: HideStructureTooltip,
  selectedPlayerId: string | null,
  placementMode: "BUILD_TOWER" | "CATAPULT_ATTACK" | "REPAIR_TOWER" | null,
  disabled: boolean,
): Promise<void> {
  const renderVersion = ++scene.renderVersion;
  const staticMapFingerprint = createStaticMapFingerprint(state);
  const layout = createHexLayout(state.tiles.map((tile) => tile.coordinate));
  const centers = new Map<string, { x: number; y: number }>();
  state.tiles.forEach((tile) => {
    const layoutItem = layout.items.get(coordinateKey(tile.coordinate));
    if (layoutItem) {
      centers.set(tile.id, layoutItem.center);
    }
  });
  scene.tileCenters = centers;

  if (staticMapFingerprint !== scene.renderedStaticMapFingerprint) {
    renderStaticMap(scene, state, layout, centers, staticMapFingerprint, onSelectTile, disabled);
  } else {
    updateTerrainInteractions(scene, disabled);
  }
  clearDynamicLayers(scene);

  const teamsById = new Map(
    state.teams.map((team, index) => [
      team.id,
      {
        ...team,
        resolvedColor: parseColor(team.color, FALLBACK_TEAM_COLORS[index] ?? "#64748b"),
      },
    ]),
  );

  state.tiles.forEach((tile) => {
    const layoutItem = layout.items.get(coordinateKey(tile.coordinate));
    if (!layoutItem) {
      return;
    }

    if (tile.ownerTeamId) {
      const team = teamsById.get(tile.ownerTeamId);
      scene.layers.territory.addChild(
        new Graphics()
          .poly(layoutItem.corners, true)
          .fill({ color: team?.resolvedColor ?? "#64748b", alpha: 0.28 }),
      );
    }

    if (tile.ownerTeamId && !tile.isConnected) {
      scene.layers.connectivity.addChild(
        new Graphics()
          .poly(layoutItem.corners, true)
          .fill({ color: "#020617", alpha: 0.38 })
          .stroke({ color: "#94a3b8", width: 2, alpha: 0.55 }),
      );
    }
  });

  const [spawnTexture, buildingTextures, towerTextures] = await Promise.all([
    safelyLoadPixiTexture(CIVILIZATION_ASSETS.spawnPoint.path),
    Promise.all(
      state.buildings.map(async (building) => {
        const key = buildingAssetKey(building);
        return [building.id, await safelyLoadPixiTexture(CIVILIZATION_ASSETS[key].path)] as const;
      }),
    ),
    Promise.all(
      state.towers.map(async (tower) => {
        const key: CivilizationAssetKey =
          tower.status === "ACTIVE"
            ? "tower.active"
            : tower.status === "DESTROYED"
              ? "tower.destroyed"
              : "tower.underConstruction";
        return [tower.id, await safelyLoadPixiTexture(CIVILIZATION_ASSETS[key].path)] as const;
      }),
    ),
  ]);

  if (renderVersion !== scene.renderVersion) {
    return;
  }

  if (spawnTexture) {
    state.spawnPoints.forEach((spawn) => {
      const center = centers.get(spawn.tileId);
      if (!center) return;
      const sprite = new Sprite(spawnTexture);
      sprite.anchor.set(0.5);
      sprite.position.set(center.x - 24, center.y - 20);
      sprite.width = 38;
      sprite.height = 38;
      sprite.tint = teamsById.get(spawn.teamId)?.resolvedColor ?? "#ffffff";
      scene.layers.spawns.addChild(sprite);
    });
  }

  const buildingTexturesById = new Map(buildingTextures);
  state.buildings.forEach((building) => {
    const center = centers.get(building.tileId);
    const tile = state.tiles.find((item) => item.id === building.tileId);
    const layoutItem = tile ? layout.items.get(coordinateKey(tile.coordinate)) : null;
    const texture = buildingTexturesById.get(building.id);
    if (!center || !texture || !layoutItem) {
      return;
    }
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.position.set(center.x, center.y - 7);
    sprite.width = MAP_STRUCTURE_SPRITE_SIZE;
    sprite.height = MAP_STRUCTURE_SPRITE_SIZE;
    sprite.eventMode = "none";
    const team = building.ownerTeamId ? teamsById.get(building.ownerTeamId) : null;
    if (team) {
      sprite.tint = team.resolvedColor;
    }
    scene.layers.buildings.addChild(sprite);
    if (building.type === "TOWN_HALL" && building.status === "CAPTURED") {
      sprite.alpha = 0.55;
      const capturedLabel = new Text({
        text: "CAPTURED",
        style: {
          fill: "#fecaca",
          fontFamily: "Arial",
          fontSize: 10,
          fontWeight: "700",
          stroke: { color: "#7f1d1d", width: 4 },
        },
      });
      capturedLabel.anchor.set(0.5);
      capturedLabel.position.set(center.x, center.y + 24);
      scene.layers.buildings.addChild(capturedLabel);
    }

    if (
      building.captureProgress > 0 &&
      building.captureRequired > 0 &&
      building.status !== "CAPTURED"
    ) {
      const captureTeam = building.capturingTeamId ? teamsById.get(building.capturingTeamId) : null;
      addStructureProgressBadge(
        scene.layers.buildings,
        center,
        `${building.captureProgress / 2}/${building.captureRequired / 2}`,
        captureTeam?.resolvedColor ?? "#94a3b8",
      );
    }
    addStructureInteraction(
      scene.layers.buildings,
      layoutItem.corners,
      { kind: "building", id: building.id },
      building.tileId,
      onSelectTile,
      onShowStructureTooltip,
      onHideStructureTooltip,
      disabled,
    );
  });

  const towerTexturesById = new Map(towerTextures);
  state.towers
    .filter((tower) => tower.status !== "CANCELLED")
    .forEach((tower) => {
      const center = centers.get(tower.tileId);
      const tile = state.tiles.find((item) => item.id === tower.tileId);
      const layoutItem = tile ? layout.items.get(coordinateKey(tile.coordinate)) : null;
      const texture = towerTexturesById.get(tower.id);
      if (!center || !texture || !layoutItem) {
        return;
      }
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.position.set(center.x, center.y - 7);
      sprite.width = MAP_STRUCTURE_SPRITE_SIZE;
      sprite.height = MAP_STRUCTURE_SPRITE_SIZE;
      sprite.eventMode = "none";
      sprite.tint = teamsById.get(tower.teamId)?.resolvedColor ?? "#ffffff";
      scene.layers.buildings.addChild(sprite);
      if (tower.destructionProgressActions > 0) {
        addStructureProgressBadge(
          scene.layers.buildings,
          center,
          `${tower.destructionProgressActions}/${tower.destructionRequiredActions}`,
          tower.status === "DESTROYED" ? "#ef4444" : "#94a3b8",
        );
      }
      addStructureInteraction(
        scene.layers.buildings,
        layoutItem.corners,
        { kind: "tower", id: tower.id },
        tower.tileId,
        onSelectTile,
        onShowStructureTooltip,
        onHideStructureTooltip,
        disabled,
      );
    });

  const playersByTile = new Map<string, CivilizationPlayer[]>();
  state.players
    .filter((player) => player.isActive)
    .forEach((player) => {
      const tilePlayers = playersByTile.get(player.currentTileId) ?? [];
      tilePlayers.push(player);
      playersByTile.set(player.currentTileId, tilePlayers);
    });
  const renderPlayers = (avatarTexturesById: Map<string, Texture | null>): void => {
    clearPixiContainer(scene.layers.players);
    scene.playerCenters = new Map();
    playersByTile.forEach((players, tileId) => {
      const center = centers.get(tileId);
      if (!center) {
        return;
      }
      const visiblePlayers = players.slice(0, 6);
      const compact = players.length > 1;
      visiblePlayers.forEach((player, index) => {
        const position = compact ? playerTokenPosition(center, index) : center;
        scene.playerCenters.set(player.id, position);
        addPlayerToken(
          scene.layers.players,
          player,
          position,
          teamsById.get(player.teamId)?.resolvedColor ?? "#64748b",
          player.id === state.access.currentPlayerId,
          avatarTexturesById.get(player.id) ?? null,
          onSelectPlayer,
          disabled,
          compact,
        );
      });
      if (players.length > 6) {
        const overflow = new Container();
        overflow.position.set(center.x, center.y + 36);
        overflow.eventMode = disabled ? "none" : "static";
        overflow.cursor = disabled ? "default" : "pointer";
        overflow.on("pointertap", (event: FederatedPointerEvent) => {
          event.stopPropagation();
          onShowPlayerStack(tileId);
        });
        overflow.addChild(
          new Graphics()
            .circle(0, 0, 17)
            .fill({ color: "#0f172a", alpha: 0.96 })
            .stroke({ color: "#ffffff", width: 2 }),
        );
        const label = new Text({
          text: `+${players.length - 6}`,
          style: { fill: "#ffffff", fontFamily: "Arial", fontSize: 12, fontWeight: "700" },
        });
        label.anchor.set(0.5);
        overflow.addChild(label);
        scene.layers.players.addChild(overflow);
      }
    });
  };
  renderPlayers(new Map());
  void Promise.all(
    state.players.map(
      async (player) =>
        [
          player.id,
          player.avatarUrl ? await safelyLoadPixiTexture(player.avatarUrl) : null,
        ] as const,
    ),
  ).then((avatarTextures) => {
    if (renderVersion === scene.renderVersion) {
      renderPlayers(new Map(avatarTextures));
    }
  });

  if (!scene.hasCentered) {
    scene.viewport.fitWorld();
    scene.viewport.setZoom(Math.min(scene.viewport.scaled, 1.15), true);
    scene.viewport.moveCenter(scene.viewport.worldWidth / 2, scene.viewport.worldHeight / 2);
    scene.hasCentered = true;
  }
  renderLegalActionOverlays(scene, state, selectedPlayerId, placementMode, onSelectTile, disabled);
  scene.renderedStateVersion = state.stateVersion;
  scene.renderedInteractionDisabled = disabled;
}

type ActionHighlightKind = "movement" | "attack" | "capture" | "contribution";

const ACTION_HIGHLIGHTS: Record<ActionHighlightKind, { fill: string; stroke: string }> = {
  movement: { fill: "#22c55e", stroke: "#86efac" },
  attack: { fill: "#ef4444", stroke: "#fca5a5" },
  capture: { fill: "#f59e0b", stroke: "#fcd34d" },
  contribution: { fill: "#06b6d4", stroke: "#67e8f9" },
};

function actionHighlightKind(type: CivilizationActionType): ActionHighlightKind {
  if (type === "MOVE") return "movement";
  if (type === "ATTACK_PLAYER" || type === "ATTACK_TOWER" || type === "CATAPULT_ATTACK")
    return "attack";
  if (type === "CAPTURE_BUILDING" || type === "CAPTURE_TOWN_HALL") return "capture";
  return "contribution";
}

function renderLegalActionOverlays(
  scene: PixiScene,
  state: CivilizationGameState,
  selectedPlayerId: string | null,
  placementMode: "BUILD_TOWER" | "CATAPULT_ATTACK" | "REPAIR_TOWER" | null,
  onSelectTile: (tileId: string) => void,
  disabled: boolean,
): void {
  clearPixiContainer(scene.layers.legalActions);
  if (!placementMode && (!selectedPlayerId || selectedPlayerId !== state.access.currentPlayerId)) {
    return;
  }
  const highlightKindsByCoordinate = new Map<string, Set<ActionHighlightKind>>();
  state.availableActions
    .filter(
      (action) =>
        action.targetCoordinate &&
        action.disabledReason === null &&
        (placementMode === "BUILD_TOWER"
          ? action.type === "BUILD_TOWER"
          : placementMode === "CATAPULT_ATTACK"
            ? action.type === "CATAPULT_ATTACK"
            : placementMode === "REPAIR_TOWER"
              ? action.type === "REPAIR_TOWER"
              : action.type !== "BUILD_TOWER" &&
                action.type !== "CATAPULT_ATTACK" &&
                action.type !== "REPAIR_TOWER"),
    )
    .forEach((action) => {
      const key = coordinateKey(action.targetCoordinate!);
      const kinds = highlightKindsByCoordinate.get(key) ?? new Set<ActionHighlightKind>();
      kinds.add(actionHighlightKind(action.type));
      highlightKindsByCoordinate.set(key, kinds);
    });

  const layout = createHexLayout(state.tiles.map((tile) => tile.coordinate));
  state.tiles.forEach((tile) => {
    const kinds = highlightKindsByCoordinate.get(coordinateKey(tile.coordinate));
    if (!kinds || kinds.size === 0) {
      return;
    }
    const layoutItem = layout.items.get(coordinateKey(tile.coordinate));
    if (layoutItem) {
      const kind = (["attack", "capture", "contribution", "movement"] as const).find((item) =>
        kinds.has(item),
      )!;
      const colors = ACTION_HIGHLIGHTS[kind];
      const actionTarget = new Graphics()
        .poly(layoutItem.corners, true)
        .fill({ color: colors.fill, alpha: 0.24 })
        .stroke({ color: colors.stroke, width: 4, alpha: 0.95 });
      actionTarget.eventMode = disabled ? "none" : "static";
      actionTarget.cursor = disabled ? "default" : "pointer";
      actionTarget.on("pointertap", (event: FederatedPointerEvent) => {
        event.stopPropagation();
        onSelectTile(tile.id);
      });
      scene.layers.legalActions.addChild(actionTarget);
    }
  });
}

function renderSelectionOverlays(
  scene: PixiScene,
  state: CivilizationGameState,
  selection: Pick<
    CivilizationGameMapProps,
    "selectedTileId" | "selectedPlayerId" | "selectedTowerId"
  >,
): void {
  clearPixiContainer(scene.layers.towerProtection);
  clearPixiContainer(scene.layers.selection);

  const layout = createHexLayout(state.tiles.map((tile) => tile.coordinate));
  const tilesById = new Map(state.tiles.map((tile) => [tile.id, tile]));

  const selectedTower = state.towers.find((tower) => tower.id === selection.selectedTowerId);
  const towerTile = selectedTower ? tilesById.get(selectedTower.tileId) : null;
  if (selectedTower?.status === "ACTIVE" && selectedTower.isConnected && towerTile) {
    state.tiles
      .filter(
        (tile) =>
          hexDistance(tile.coordinate, towerTile.coordinate) <= selectedTower.protectionRadius,
      )
      .forEach((tile) => {
        const layoutItem = layout.items.get(coordinateKey(tile.coordinate));
        if (!layoutItem) {
          return;
        }
        scene.layers.towerProtection.addChild(
          new Graphics()
            .poly(layoutItem.corners, true)
            .fill({ color: "#ef4444", alpha: 0.17 })
            .stroke({ color: "#fb7185", width: 2, alpha: 0.75 }),
        );
      });
  }

  if (selection.selectedTileId) {
    const selectedTile = tilesById.get(selection.selectedTileId);
    const layoutItem = selectedTile
      ? layout.items.get(coordinateKey(selectedTile.coordinate))
      : null;
    if (layoutItem) {
      scene.layers.selection.addChild(
        new Graphics()
          .poly(layoutItem.corners, true)
          .stroke({ color: "#facc15", width: 5, alpha: 1 }),
      );
    }
  }

  if (selection.selectedPlayerId) {
    const center = scene.playerCenters.get(selection.selectedPlayerId);
    if (center) {
      scene.layers.selection.addChild(
        new Graphics()
          .circle(center.x, center.y, 27)
          .stroke({ color: "#ffffff", width: 3, alpha: 1 }),
      );
    }
  }
}

export function CivilizationGameMap({
  state,
  selectedTileId,
  selectedPlayerId,
  selectedTowerId,
  placementMode,
  placementTileId,
  isInteractionDisabled = false,
  onSelectTile,
  onSelectPlayer,
  onCancelSelection,
  onToggleTowerPlacement,
  onToggleCatapult,
  onToggleRepairKit,
  onCancelPlacement,
  onCancelPlacementPreview,
  onConfirmPlacement,
  className,
}: CivilizationGameMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PixiScene | null>(null);
  const stateRef = useRef(state);
  const selectionRef = useRef({ selectedTileId, selectedPlayerId, selectedTowerId });
  const onSelectTileRef = useRef(onSelectTile);
  const onSelectPlayerRef = useRef(onSelectPlayer);
  const onCancelSelectionRef = useRef(onCancelSelection);
  const placementModeRef = useRef(placementMode);
  const onCancelPlacementRef = useRef(onCancelPlacement);
  const disabledRef = useRef(isInteractionDisabled);
  const placementPreviewRef = useRef<HTMLDivElement>(null);
  const playedAttackIdsRef = useRef(new Set<string>());
  const attackHistoryInitializedRef = useRef(false);
  const activeAttackAnimationCleanupsRef = useRef(new Set<() => void>());
  const [structureTooltip, setStructureTooltip] = useState<StructureTooltipState | null>(null);
  const [playerStackTileId, setPlayerStackTileId] = useState<string | null>(null);
  const [mapSize, setMapSize] = useState({ width: 320, height: 420 });
  const showStructureTooltipRef = useRef<ShowStructureTooltip>((target, event, isPinned) => {
    setStructureTooltip({
      ...target,
      x: event.global.x,
      y: event.global.y,
      isPinned,
    });
  });
  const hideStructureTooltipRef = useRef<HideStructureTooltip>((target) => {
    setStructureTooltip((current) =>
      current && current.kind === target.kind && current.id === target.id && !current.isPinned
        ? null
        : current,
    );
  });

  useEffect(() => {
    stateRef.current = state;
    selectionRef.current = { selectedTileId, selectedPlayerId, selectedTowerId };
    onSelectTileRef.current = onSelectTile;
    onSelectPlayerRef.current = onSelectPlayer;
    onCancelSelectionRef.current = onCancelSelection;
    placementModeRef.current = placementMode;
    onCancelPlacementRef.current = onCancelPlacement;
    disabledRef.current = isInteractionDisabled;
  }, [
    isInteractionDisabled,
    onSelectPlayer,
    onSelectTile,
    onCancelSelection,
    onCancelPlacement,
    placementMode,
    selectedPlayerId,
    selectedTileId,
    selectedTowerId,
    state,
  ]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    const activeAttackCleanups = activeAttackAnimationCleanupsRef.current;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    const initialize = async (): Promise<void> => {
      const app = new Application();
      await app.init({
        antialias: true,
        background: "#07111f",
        backgroundAlpha: 1,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
        width: Math.max(host.clientWidth, 320),
        height: Math.max(host.clientHeight, 420),
      });
      if (cancelled) {
        app.destroy(true, { children: true });
        return;
      }

      host.replaceChildren(app.canvas);
      const viewport = new Viewport({
        screenWidth: host.clientWidth,
        screenHeight: host.clientHeight,
        worldWidth: 1_200,
        worldHeight: 900,
        events: app.renderer.events,
        ticker: app.ticker,
        threshold: 6,
        passiveWheel: false,
        stopPropagation: true,
      });
      viewport
        .drag({ mouseButtons: "left" })
        .pinch()
        .wheel({ percent: 0.12, smooth: false, trackpadPinch: true })
        .decelerate()
        .clamp({ direction: "all" })
        .clampZoom({ minScale: MINIMUM_MAP_ZOOM, maxScale: MAXIMUM_MAP_ZOOM });
      viewport.on("pointertap", () => {
        setStructureTooltip(null);
        onCancelPlacementRef.current();
        onCancelSelectionRef.current();
      });
      app.stage.addChild(viewport);

      const layers: SceneLayers = {
        terrain: new Container({ label: "TerrainLayer" }),
        territory: new Container({ label: "TerritoryLayer" }),
        connectivity: new Container({ label: "ConnectivityLayer" }),
        spawns: new Container({ label: "SpawnLayer" }),
        buildings: new Container({ label: "BuildingLayer" }),
        towerProtection: new Container({ label: "TowerProtectionLayer" }),
        players: new Container({ label: "PlayerLayer" }),
        legalActions: new Container({ label: "LegalActionLayer" }),
        selection: new Container({ label: "SelectionLayer" }),
        effects: new Container({ label: "EffectsLayer" }),
      };
      viewport.addChild(
        layers.terrain,
        layers.territory,
        layers.connectivity,
        layers.spawns,
        layers.legalActions,
        layers.buildings,
        layers.towerProtection,
        layers.players,
        layers.selection,
        layers.effects,
      );
      const scene: PixiScene = {
        app,
        viewport,
        layers,
        hasCentered: false,
        renderVersion: 0,
        staticMapRenderVersion: 0,
        renderedStaticMapFingerprint: null,
        renderedStateVersion: null,
        renderedInteractionDisabled: disabledRef.current,
        tileCenters: new Map(),
        terrainTileGraphics: new Map(),
        playerCenters: new Map(),
      };
      sceneRef.current = scene;

      resizeObserver = new ResizeObserver(() => {
        const width = Math.max(host.clientWidth, 320);
        const height = Math.max(host.clientHeight, 420);
        const center = viewport.center;
        app.renderer.resize(width, height);
        viewport.resize(width, height, viewport.worldWidth, viewport.worldHeight);
        setMapSize({ width, height });
        if (scene.hasCentered) {
          viewport.moveCenter(center);
        }
      });
      resizeObserver.observe(host);

      await renderBaseScene(
        scene,
        stateRef.current,
        (tileId) => {
          setStructureTooltip(null);
          onSelectTileRef.current(tileId);
        },
        (playerId) => {
          setStructureTooltip(null);
          onSelectPlayerRef.current(playerId);
        },
        (tileId) => setPlayerStackTileId(tileId),
        (target, event, isPinned) => showStructureTooltipRef.current(target, event, isPinned),
        (target) => hideStructureTooltipRef.current(target),
        selectionRef.current.selectedPlayerId,
        placementModeRef.current,
        disabledRef.current,
      );
      if (!cancelled && sceneRef.current === scene) {
        renderSelectionOverlays(scene, stateRef.current, selectionRef.current);
      }
    };

    void initialize();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      activeAttackCleanups.forEach((cleanup) => cleanup());
      activeAttackCleanups.clear();
      const scene = sceneRef.current;
      sceneRef.current = null;
      if (scene) {
        scene.renderVersion += 1;
        scene.staticMapRenderVersion += 1;
        scene.renderedStaticMapFingerprint = null;
        scene.app.stage.removeChild(scene.viewport);
        scene.viewport.destroy({ children: true });
        scene.app.destroy(true, { children: true });
      }
      host.replaceChildren();
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }
    if (
      scene.renderedStateVersion === state.stateVersion &&
      scene.renderedStaticMapFingerprint === createStaticMapFingerprint(state) &&
      scene.renderedInteractionDisabled === isInteractionDisabled
    ) {
      renderLegalActionOverlays(
        scene,
        state,
        selectionRef.current.selectedPlayerId,
        placementMode,
        (tileId) => onSelectTileRef.current(tileId),
        isInteractionDisabled,
      );
      renderSelectionOverlays(scene, state, selectionRef.current);
      return;
    }
    void renderBaseScene(
      scene,
      state,
      (tileId) => {
        setStructureTooltip(null);
        onSelectTileRef.current(tileId);
      },
      (playerId) => {
        setStructureTooltip(null);
        onSelectPlayerRef.current(playerId);
      },
      (tileId) => setPlayerStackTileId(tileId),
      (target, event, isPinned) => showStructureTooltipRef.current(target, event, isPinned),
      (target) => hideStructureTooltipRef.current(target),
      selectionRef.current.selectedPlayerId,
      placementMode,
      isInteractionDisabled,
    ).then(() => {
      if (sceneRef.current === scene) {
        renderSelectionOverlays(scene, stateRef.current, selectionRef.current);
      }
    });
  }, [isInteractionDisabled, placementMode, state]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }
    renderLegalActionOverlays(
      scene,
      stateRef.current,
      selectedPlayerId,
      placementMode,
      (tileId) => onSelectTileRef.current(tileId),
      isInteractionDisabled,
    );
    renderSelectionOverlays(scene, stateRef.current, {
      selectedTileId,
      selectedPlayerId,
      selectedTowerId,
    });
  }, [isInteractionDisabled, placementMode, selectedPlayerId, selectedTileId, selectedTowerId]);

  useEffect(() => {
    const scene = sceneRef.current;
    const preview = placementPreviewRef.current;
    const center = placementTileId ? scene?.tileCenters.get(placementTileId) : null;
    if (!scene || !preview || !center) {
      return;
    }

    const positionPreview = (): void => {
      const position = scene.viewport.toScreen(center);
      preview.style.transform = `translate(${position.x}px, ${position.y}px)`;
    };
    positionPreview();
    scene.viewport.on("moved", positionPreview);
    scene.viewport.on("zoomed", positionPreview);
    return () => {
      scene.viewport.off("moved", positionPreview);
      scene.viewport.off("zoomed", positionPreview);
    };
  }, [mapSize.height, mapSize.width, placementTileId, state.stateVersion]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !structureTooltip?.isPinned) return;
    const structure =
      structureTooltip.kind === "building"
        ? state.buildings.find((building) => building.id === structureTooltip.id)
        : state.towers.find((tower) => tower.id === structureTooltip.id);
    const center = structure ? scene.tileCenters.get(structure.tileId) : null;
    if (!center) return;
    const updatePosition = (): void => {
      const position = scene.viewport.toScreen(center);
      setStructureTooltip((current) =>
        current && current.id === structureTooltip.id
          ? { ...current, x: position.x, y: position.y }
          : current,
      );
    };
    updatePosition();
    scene.viewport.on("moved", updatePosition);
    scene.viewport.on("zoomed", updatePosition);
    return () => {
      scene.viewport.off("moved", updatePosition);
      scene.viewport.off("zoomed", updatePosition);
    };
  }, [
    mapSize.height,
    mapSize.width,
    state,
    structureTooltip?.id,
    structureTooltip?.isPinned,
    structureTooltip?.kind,
  ]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const unseenAttacks = state.recentCatapultAttacks.filter(
      (attack) => !playedAttackIdsRef.current.has(attack.id),
    );
    unseenAttacks.forEach((attack) => playedAttackIdsRef.current.add(attack.id));
    const attacksToPlay = attackHistoryInitializedRef.current
      ? [...unseenAttacks].reverse()
      : unseenAttacks.slice(0, 1);
    attackHistoryInitializedRef.current = true;

    attacksToPlay.forEach((attack, index) => {
      const startTimer = window.setTimeout(() => {
        activeAttackAnimationCleanupsRef.current.delete(cancelStart);
        const sourceTileId = attack.payload.sourceTileId;
        const targetTileId = attack.payload.targetTileId;
        if (typeof sourceTileId !== "string" || typeof targetTileId !== "string") return;
        const source = scene.tileCenters.get(sourceTileId);
        const target = scene.tileCenters.get(targetTileId);
        if (!source || !target) return;

        const catapult = new Graphics()
          .rect(-13, -7, 26, 14)
          .fill({ color: "#a16207", alpha: 0.9 });
        catapult.position.set(source.x, source.y - 7);
        const impact = new Graphics().circle(0, 0, 24).fill({ color: "#f97316", alpha: 0 });
        impact.position.set(target.x, target.y);
        scene.layers.effects.addChild(catapult, impact);

        let finishTimer: number | null = null;
        let ball: Graphics | null = null;
        let animate: (() => void) | null = null;
        const cleanup = (): void => {
          activeAttackAnimationCleanupsRef.current.delete(cleanup);
          if (animate) scene.app.ticker.remove(animate);
          if (finishTimer !== null) window.clearTimeout(finishTimer);
          if (!catapult.destroyed) catapult.destroy();
          if (ball && !ball.destroyed) ball.destroy();
          if (!impact.destroyed) impact.destroy();
        };
        activeAttackAnimationCleanupsRef.current.add(cleanup);

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          impact.alpha = 0.8;
          finishTimer = window.setTimeout(cleanup, 320);
          return;
        }

        ball = new Graphics().circle(0, 0, 6).fill({ color: "#111827", alpha: 1 });
        ball.position.set(source.x, source.y - 18);
        scene.layers.effects.addChild(ball);
        const startedAt = performance.now();
        animate = (): void => {
          const progress = Math.min(1, (performance.now() - startedAt) / 650);
          ball?.position.set(
            source.x + (target.x - source.x) * progress,
            source.y -
              18 +
              (target.y - source.y + 18) * progress -
              Math.sin(progress * Math.PI) * 55,
          );
          if (progress >= 1) {
            impact.alpha = 0.85;
            if (animate) scene.app.ticker.remove(animate);
            animate = null;
            finishTimer = window.setTimeout(cleanup, 220);
          }
        };
        scene.app.ticker.add(animate);
      }, index * 180);
      const cancelStart = (): void => window.clearTimeout(startTimer);
      activeAttackAnimationCleanupsRef.current.add(cancelStart);
    });
  }, [state.recentCatapultAttacks]);

  useEffect(
    () => () => {
      activeAttackAnimationCleanupsRef.current.forEach((cleanup) => cleanup());
      activeAttackAnimationCleanupsRef.current.clear();
    },
    [],
  );

  const centerCurrentPlayer = (): void => {
    const scene = sceneRef.current;
    const currentPlayer = state.players.find(
      (player) => player.id === state.access.currentPlayerId,
    );
    const center = currentPlayer ? scene?.tileCenters.get(currentPlayer.currentTileId) : null;
    if (scene && center) {
      scene.viewport.animate({ position: center, time: 350, ease: "easeInOutSine" });
    }
  };

  const currentPlayer = state.players.find((player) => player.id === state.access.currentPlayerId);
  const stackedPlayers = playerStackTileId
    ? state.players.filter(
        (player) => player.isActive && player.currentTileId === playerStackTileId,
      )
    : [];
  const currentTeam = currentPlayer
    ? state.teams.find((team) => team.id === currentPlayer.teamId)
    : null;
  const enabledTowerPlacements = state.availableActions.filter(
    (action) => action.type === "BUILD_TOWER" && action.disabledReason === null,
  );
  const towerPlacementUnavailableReason =
    state.availableActions.find(
      (action) => action.type === "BUILD_TOWER" && action.disabledReason !== null,
    )?.disabledReason ?? "No legal tower placement hexes are available.";
  const enabledCatapultTargets = state.availableActions.filter(
    (action) => action.type === "CATAPULT_ATTACK" && action.disabledReason === null,
  );
  const catapultUnavailableReason =
    state.availableActions.find(
      (action) => action.type === "CATAPULT_ATTACK" && action.disabledReason !== null,
    )?.disabledReason ?? "No valid enemy structure targets are available.";
  const enabledRepairTargets = state.availableActions.filter(
    (action) => action.type === "REPAIR_TOWER" && action.disabledReason === null,
  );
  const repairUnavailableReason =
    state.availableActions.find(
      (action) => action.type === "REPAIR_TOWER" && action.disabledReason !== null,
    )?.disabledReason ?? "No damaged adjacent allied structures are available.";

  return (
    <div
      className={cn(
        "relative min-h-105 touch-none overflow-hidden overscroll-contain border bg-slate-950 shadow-inner select-none",
        className,
      )}
      onPointerDown={(event) => {
        if (
          !(event.target instanceof Element) ||
          !event.target.closest("[data-structure-tooltip]")
        ) {
          setStructureTooltip(null);
        }
      }}
    >
      <div
        ref={hostRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing [&>canvas]:block [&>canvas]:touch-none [&>canvas]:overscroll-contain"
        role="img"
        aria-label="Civilization hex map"
      />
      {currentPlayer && !state.access.isReadOnly ? (
        <div
          className="absolute top-3 left-3 flex flex-col gap-2 sm:flex-row"
          data-map-overlay-control
        >
          {BUILDING_PLACEMENT_CONTROLS.map((control) => {
            const disabled = isInteractionDisabled || enabledTowerPlacements.length === 0;
            return (
              <Button
                key={control.actionType}
                type="button"
                size="sm"
                className="h-auto min-w-18 flex-col gap-1 p-2"
                variant={placementMode === control.actionType ? "default" : "secondary"}
                aria-label={control.label}
                aria-pressed={placementMode === control.actionType}
                disabled={disabled}
                title={disabled ? towerPlacementUnavailableReason : control.label}
                onClick={onToggleTowerPlacement}
              >
                <Image
                  src={control.asset.path}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-auto object-contain"
                />
                <span className="flex gap-2 text-[9px]">
                  <span className="flex items-center gap-0.5">
                    <CoinsIcon className="size-3 text-amber-300" />
                    {state.game.settings.tower.buildGoldCost}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <ZapIcon className="size-3 text-cyan-300" />
                    {state.game.settings.costs.towerBuildUnits / 2}
                  </span>
                </span>
              </Button>
            );
          })}
          <Button
            type="button"
            size="sm"
            variant={placementMode === "CATAPULT_ATTACK" ? "default" : "secondary"}
            className="h-auto min-w-18 flex-col gap-1 p-2"
            aria-label="Target an enemy structure with a Catapult"
            aria-pressed={placementMode === "CATAPULT_ATTACK"}
            disabled={isInteractionDisabled || enabledCatapultTargets.length === 0}
            title={
              enabledCatapultTargets.length === 0
                ? catapultUnavailableReason.replaceAll("_", " ").toLowerCase()
                : "Use Catapult"
            }
            onClick={onToggleCatapult}
          >
            <Image
              src={CIVILIZATION_ASSETS["item.catapult"].path}
              alt=""
              width={32}
              height={32}
              className="size-8 object-contain"
            />
            <span className="flex gap-2 text-[9px]">
              <span className="flex items-center gap-0.5">
                <CoinsIcon className="size-3 text-amber-300" />
                {state.game.settings.catapult.goldPrice}
              </span>
              <span className="flex items-center gap-0.5">
                <ZapIcon className="size-3 text-cyan-300" />
                {state.game.settings.catapult.actionPointUnits / 2}
              </span>
            </span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={placementMode === "REPAIR_TOWER" ? "default" : "secondary"}
            className="h-auto min-w-18 flex-col gap-1 p-2"
            aria-label="Repair an adjacent allied structure with a Repair Kit"
            aria-pressed={placementMode === "REPAIR_TOWER"}
            disabled={isInteractionDisabled || enabledRepairTargets.length === 0}
            title={
              enabledRepairTargets.length === 0
                ? repairUnavailableReason.replaceAll("_", " ").toLowerCase()
                : "Use Repair Kit"
            }
            onClick={onToggleRepairKit}
          >
            <Image
              src={CIVILIZATION_ASSETS["item.repairKit"].path}
              alt=""
              width={32}
              height={32}
              className="size-8 object-contain"
            />
            <span className="flex gap-2 text-[9px]">
              <span className="flex items-center gap-0.5">
                <CoinsIcon className="size-3 text-amber-300" />
                {state.game.settings.repairKit.goldPrice}
              </span>
              <span className="flex items-center gap-0.5">
                <ZapIcon className="size-3 text-cyan-300" />
                {state.game.settings.costs.towerRepairUnits / 2}
              </span>
            </span>
          </Button>
        </div>
      ) : null}
      {structureTooltip ? (
        <StructureTooltip
          tooltip={structureTooltip}
          state={state}
          mapWidth={mapSize.width}
          mapHeight={mapSize.height}
        />
      ) : null}
      {playerStackTileId && stackedPlayers.length > 0 ? (
        <div
          className="absolute top-1/2 left-1/2 z-30 w-64 max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 border border-white/20 bg-slate-950/95 p-3 text-slate-100 shadow-xl"
          data-map-overlay-control
          role="dialog"
          aria-label="Players on team spawn"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold">Players on this hex</p>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label="Close player list"
              onClick={() => setPlayerStackTileId(null)}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {stackedPlayers.map((player) => {
              const team = state.teams.find((candidate) => candidate.id === player.teamId);
              return (
                <button
                  key={player.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-3 border border-white/10 px-2 py-2 text-left text-xs hover:bg-white/10 disabled:opacity-50"
                  disabled={isInteractionDisabled}
                  onClick={() => {
                    onSelectPlayer(player.id);
                    setPlayerStackTileId(null);
                  }}
                >
                  <span className="truncate">{player.username}</span>
                  <span className="shrink-0 text-[10px] text-slate-400">{team?.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {placementTileId ? (
        <div ref={placementPreviewRef} className="pointer-events-none absolute top-0 left-0 z-20">
          <Image
            src={CIVILIZATION_ASSETS["tower.active"].path}
            alt="Defensive tower placement preview"
            width={72}
            height={72}
            className="absolute h-18 w-auto -translate-x-1/2 -translate-y-1/2 object-contain opacity-60"
          />
          <div
            className="pointer-events-auto absolute top-9 left-1/2 flex -translate-x-1/2 gap-1"
            data-map-overlay-control
          >
            <Button
              type="button"
              size="icon"
              className="size-7 bg-emerald-600 hover:bg-emerald-500"
              aria-label="Confirm defensive tower construction"
              disabled={isInteractionDisabled}
              onClick={onConfirmPlacement}
            >
              <CheckIcon className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="size-7"
              aria-label="Choose another tower placement hex"
              disabled={isInteractionDisabled}
              onClick={onCancelPlacementPreview}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
      <div className="absolute top-3 right-3 flex items-start gap-2" data-map-overlay-control>
        {currentTeam ? (
          <dl className="grid gap-1 border border-white/20 bg-slate-950/85 px-2 py-1.5 text-[10px] text-slate-100 shadow-sm backdrop-blur-sm">
            <div
              className="flex items-center justify-between gap-2"
              title="Current team gold"
              aria-label={`Current team gold: ${formatNumber(currentTeam.goldAmount)}`}
            >
              <dt>
                <CoinsIcon className="size-3.5 text-amber-300" aria-hidden="true" />
              </dt>
              <dd>{formatNumber(currentTeam.goldAmount)}</dd>
            </div>
            <div
              className="flex items-center justify-between gap-2"
              title="Current team score"
              aria-label={`Current team score: ${formatNumber(currentTeam.estimatedScore)}`}
            >
              <dt>
                <TrophyIcon className="size-3.5 text-violet-300" aria-hidden="true" />
              </dt>
              <dd>{formatNumber(currentTeam.estimatedScore)}</dd>
            </div>
          </dl>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Zoom in"
            disabled={isInteractionDisabled}
            onClick={() => sceneRef.current?.viewport.zoomPercent(MAP_ZOOM_STEP, true)}
          >
            <PlusIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Zoom out"
            disabled={isInteractionDisabled}
            onClick={() => sceneRef.current?.viewport.zoomPercent(-MAP_ZOOM_STEP, true)}
          >
            <MinusIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            aria-label="Center on current player"
            disabled={isInteractionDisabled || !state.access.currentPlayerId}
            onClick={centerCurrentPlayer}
          >
            <LocateFixedIcon className="size-4" />
          </Button>
        </div>
      </div>
      {selectedPlayerId === state.access.currentPlayerId ? (
        <div className="pointer-events-none absolute right-3 bottom-3 grid gap-1 rounded-sm border border-white/20 bg-slate-950/80 px-3 py-2 text-[10px] text-slate-200 backdrop-blur-sm">
          <span>
            <span className="mr-1.5 inline-block size-2 bg-green-500" /> Move
          </span>
          <span>
            <span className="mr-1.5 inline-block size-2 bg-red-500" /> Attack
          </span>
          <span>
            <span className="mr-1.5 inline-block size-2 bg-amber-500" /> Capture
          </span>
          <span>
            <span className="mr-1.5 inline-block size-2 bg-cyan-500" /> Build / repair / defend
          </span>
        </div>
      ) : null}
    </div>
  );
}
