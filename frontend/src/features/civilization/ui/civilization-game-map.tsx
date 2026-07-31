"use client";

import { useEffect, useRef } from "react";
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
import { LocateFixedIcon, MinusIcon, PlusIcon } from "lucide-react";

import {
  CIVILIZATION_ASSETS,
  type CivilizationAssetKey,
  type CivilizationBuilding,
  type CivilizationGameState,
  type CivilizationPlayer,
} from "@/entities/civilization";
import { cn } from "@/shared/lib/utils";
import { clearPixiContainer, safelyLoadPixiTexture } from "@/shared/lib/pixi";
import { Button } from "@/shared/ui/8bit";

import { coordinateKey, createHexLayout, hexDistance } from "../model/hex-grid";

interface CivilizationGameMapProps {
  state: CivilizationGameState;
  selectedTileId: string | null;
  selectedPlayerId: string | null;
  selectedTowerId: string | null;
  isInteractionDisabled?: boolean;
  onSelectTile: (tileId: string) => void;
  onSelectPlayer: (playerId: string) => void;
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

const FALLBACK_TEAM_COLORS = ["#6366f1", "#f43f5e"] as const;

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

function addPlayerToken(
  layer: Container,
  player: CivilizationPlayer,
  position: { x: number; y: number },
  teamColor: string,
  isCurrentPlayer: boolean,
  avatarTexture: Texture | null,
  onSelectPlayer: (playerId: string) => void,
  disabled: boolean,
): void {
  const token = new Container();
  token.position.set(position.x, position.y);
  token.eventMode = disabled ? "none" : "static";
  token.cursor = disabled ? "default" : "pointer";
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
  layer.addChild(token);
}

function playerTokenPosition(
  tileCenter: { x: number; y: number },
  stackIndex: number,
): { x: number; y: number } {
  const offsetX = (stackIndex % 3) * 18 - Math.min(2, stackIndex) * 9;
  const offsetY = Math.floor(stackIndex / 3) * 18;
  return { x: tileCenter.x + offsetX, y: tileCenter.y - 4 + offsetY };
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
    scene.app.renderer.width / scene.app.renderer.resolution,
    scene.app.renderer.height / scene.app.renderer.resolution,
    layout.width,
    layout.height,
  );

  state.tiles.forEach((tile) => {
    const layoutItem = layout.items.get(coordinateKey(tile.coordinate));
    if (!layoutItem) {
      return;
    }

    const baseFill = tile.terrainType === "MOUNTAIN" ? "#273449" : "#31473a";
    const terrain = new Graphics()
      .poly(layoutItem.corners, true)
      .fill({ color: baseFill, alpha: 1 })
      .stroke({ color: "#0f172a", width: 2, alpha: 0.95 });
    terrain.eventMode = disabled ? "none" : "static";
    terrain.cursor = disabled ? "default" : "pointer";
    terrain.on("pointertap", () => onSelectTile(tile.id));
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
        sprite.width = 58;
        sprite.height = 58;
        scene.layers.terrain.addChild(sprite);
      });
  });
}

async function renderBaseScene(
  scene: PixiScene,
  state: CivilizationGameState,
  onSelectTile: (tileId: string) => void,
  onSelectPlayer: (playerId: string) => void,
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
      if (!center) {
        return;
      }
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
    const texture = buildingTexturesById.get(building.id);
    if (!center || !texture) {
      return;
    }
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.position.set(center.x, center.y - 6);
    sprite.width = 58;
    sprite.height = 58;
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

    if (building.capturingTeamId && building.captureProgress > 0) {
      const captureTeam = teamsById.get(building.capturingTeamId);
      const progress = new Text({
        text: `${building.captureProgress / 2}/${building.captureRequired / 2}`,
        style: {
          fill: captureTeam?.resolvedColor ?? "#ffffff",
          fontFamily: "Arial",
          fontSize: 11,
          fontWeight: "700",
          stroke: { color: "#020617", width: 3 },
        },
      });
      progress.anchor.set(0.5);
      progress.position.set(center.x, center.y + 25);
      scene.layers.buildings.addChild(progress);
    }
  });

  const towerTexturesById = new Map(towerTextures);
  state.towers
    .filter((tower) => tower.status !== "CANCELLED")
    .forEach((tower) => {
      const center = centers.get(tower.tileId);
      const texture = towerTexturesById.get(tower.id);
      if (!center || !texture) {
        return;
      }
      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.position.set(center.x + 24, center.y - 20);
      sprite.width = 40;
      sprite.height = 40;
      sprite.tint = teamsById.get(tower.teamId)?.resolvedColor ?? "#ffffff";
      scene.layers.buildings.addChild(sprite);
    });

  const playersByTile = new Map<string, CivilizationPlayer[]>();
  state.players.forEach((player) => {
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
      players.forEach((player, index) => {
        const position = playerTokenPosition(center, index);
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
        );
      });
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
    scene.viewport.fitWorld(true);
    scene.viewport.setZoom(Math.min(scene.viewport.scaled, 1.15), true);
    scene.hasCentered = true;
  }
  renderLegalActionOverlays(scene, state);
  scene.renderedStateVersion = state.stateVersion;
  scene.renderedInteractionDisabled = disabled;
}

function renderLegalActionOverlays(scene: PixiScene, state: CivilizationGameState): void {
  clearPixiContainer(scene.layers.legalActions);
  const legalMoveTargets = new Set(
    state.availableActions
      .filter(
        (action) =>
          action.type === "MOVE" && action.targetCoordinate && action.disabledReason === null,
      )
      .map((action) => coordinateKey(action.targetCoordinate!)),
  );
  if (legalMoveTargets.size === 0) {
    return;
  }

  const layout = createHexLayout(state.tiles.map((tile) => tile.coordinate));
  state.tiles.forEach((tile) => {
    if (!legalMoveTargets.has(coordinateKey(tile.coordinate))) {
      return;
    }
    const layoutItem = layout.items.get(coordinateKey(tile.coordinate));
    if (layoutItem) {
      scene.layers.legalActions.addChild(
        new Graphics()
          .poly(layoutItem.corners, true)
          .fill({ color: "#22c55e", alpha: 0.2 })
          .stroke({ color: "#86efac", width: 4, alpha: 0.95 }),
      );
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
  isInteractionDisabled = false,
  onSelectTile,
  onSelectPlayer,
  className,
}: CivilizationGameMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PixiScene | null>(null);
  const stateRef = useRef(state);
  const selectionRef = useRef({ selectedTileId, selectedPlayerId, selectedTowerId });
  const onSelectTileRef = useRef(onSelectTile);
  const onSelectPlayerRef = useRef(onSelectPlayer);
  const disabledRef = useRef(isInteractionDisabled);

  useEffect(() => {
    stateRef.current = state;
    selectionRef.current = { selectedTileId, selectedPlayerId, selectedTowerId };
    onSelectTileRef.current = onSelectTile;
    onSelectPlayerRef.current = onSelectPlayer;
    disabledRef.current = isInteractionDisabled;
  }, [
    isInteractionDisabled,
    onSelectPlayer,
    onSelectTile,
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
      });
      viewport
        .drag()
        .pinch()
        .wheel({ smooth: 3 })
        .decelerate()
        .clamp({ direction: "all" })
        .clampZoom({ minScale: 0.3, maxScale: 2.4 });
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
        layers.buildings,
        layers.towerProtection,
        layers.players,
        layers.legalActions,
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
        app.renderer.resize(width, height);
        viewport.resize(width, height, viewport.worldWidth, viewport.worldHeight);
      });
      resizeObserver.observe(host);

      await renderBaseScene(
        scene,
        stateRef.current,
        (tileId) => onSelectTileRef.current(tileId),
        (playerId) => onSelectPlayerRef.current(playerId),
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
      const scene = sceneRef.current;
      sceneRef.current = null;
      if (scene) {
        scene.renderVersion += 1;
        scene.staticMapRenderVersion += 1;
        scene.renderedStaticMapFingerprint = null;
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
      renderLegalActionOverlays(scene, state);
      renderSelectionOverlays(scene, state, selectionRef.current);
      return;
    }
    void renderBaseScene(
      scene,
      state,
      (tileId) => onSelectTileRef.current(tileId),
      (playerId) => onSelectPlayerRef.current(playerId),
      isInteractionDisabled,
    ).then(() => {
      if (sceneRef.current === scene) {
        renderSelectionOverlays(scene, stateRef.current, selectionRef.current);
      }
    });
  }, [isInteractionDisabled, state]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) {
      return;
    }
    renderSelectionOverlays(scene, stateRef.current, {
      selectedTileId,
      selectedPlayerId,
      selectedTowerId,
    });
  }, [selectedPlayerId, selectedTileId, selectedTowerId]);

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

  return (
    <div
      className={cn(
        "relative min-h-105 overflow-hidden border bg-slate-950 shadow-inner",
        className,
      )}
    >
      <div
        ref={hostRef}
        className="absolute inset-0 [&>canvas]:block"
        role="img"
        aria-label="Civilization hex map"
      />
      <div className="absolute top-3 right-3 flex flex-col gap-2">
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="Zoom in"
          onClick={() => sceneRef.current?.viewport.zoomPercent(0.18, true)}
        >
          <PlusIcon className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="Zoom out"
          onClick={() => sceneRef.current?.viewport.zoomPercent(-0.18, true)}
        >
          <MinusIcon className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label="Center on current player"
          disabled={!state.access.currentPlayerId}
          onClick={centerCurrentPlayer}
        >
          <LocateFixedIcon className="size-4" />
        </Button>
      </div>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded-sm border border-white/20 bg-slate-950/80 px-3 py-2 text-[10px] text-slate-200 backdrop-blur-sm">
        Drag to pan · wheel or pinch to zoom
      </div>
    </div>
  );
}
