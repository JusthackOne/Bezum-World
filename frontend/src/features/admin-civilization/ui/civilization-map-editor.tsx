"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Application, Container, Graphics, Sprite, Text } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { CopyIcon, EyeIcon, EyeOffIcon, Redo2Icon, RotateCcwIcon, Undo2Icon } from "lucide-react";

import {
  CIVILIZATION_ASSETS,
  type CivilizationAdminGameInput,
  type CivilizationAdminMapInput,
  type CivilizationAttributeKey,
  type CivilizationAssetKey,
  type CivilizationSettings,
  type CivilizationTeamSide,
  type CivilizationValidationIssue,
  type HexCoordinate,
} from "@/entities/civilization";
import {
  coordinateKey,
  createHexagonalMap,
  createHexLayout,
  hexDistance,
} from "@/features/civilization/model";
import { cn } from "@/shared/lib/utils";
import { clearPixiContainer, safelyLoadPixiTexture } from "@/shared/lib/pixi";
import { Button } from "@/shared/ui/8bit";

type EditorTool =
  | "TOGGLE_HEX"
  | "GROUND"
  | "MOUNTAIN"
  | "OWNER_TEAM_A"
  | "OWNER_TEAM_B"
  | "OWNER_NEUTRAL"
  | "TOWN_HALL_TEAM_A"
  | "TOWN_HALL_TEAM_B"
  | "SPAWN_TEAM_A"
  | "SPAWN_TEAM_B"
  | "GOLD_BUILDING"
  | `ATTRIBUTE_${Uppercase<CivilizationAttributeKey>}`
  | "PLAYER"
  | "TOWER_TEAM_A"
  | "TOWER_TEAM_B"
  | "MOVE"
  | "DELETE_OBJECT";

interface EditorScene {
  app: Application;
  viewport: Viewport;
  gridLayer: Container;
  objectLayer: Container;
  validationLayer: Container;
  renderVersion: number;
  initializedView: boolean;
}

interface CivilizationMapEditorProps {
  value: CivilizationAdminMapInput;
  teams: CivilizationAdminGameInput["teams"];
  settings: CivilizationSettings;
  users: Array<{ id: string; username: string; avatarUrl: string | null }>;
  issues: CivilizationValidationIssue[];
  disabled?: boolean;
  onChange: (value: CivilizationAdminMapInput) => void;
}

const toolOptions: Array<{ value: EditorTool; label: string }> = [
  { value: "TOGGLE_HEX", label: "Add / remove hex" },
  { value: "GROUND", label: "Paint ground" },
  { value: "MOUNTAIN", label: "Paint mountain" },
  { value: "OWNER_TEAM_A", label: "Ownership: team A" },
  { value: "OWNER_TEAM_B", label: "Ownership: team B" },
  { value: "OWNER_NEUTRAL", label: "Ownership: neutral" },
  { value: "TOWN_HALL_TEAM_A", label: "Town hall: team A" },
  { value: "TOWN_HALL_TEAM_B", label: "Town hall: team B" },
  { value: "SPAWN_TEAM_A", label: "Spawn: team A" },
  { value: "SPAWN_TEAM_B", label: "Spawn: team B" },
  { value: "GOLD_BUILDING", label: "Gold building" },
  { value: "ATTRIBUTE_STRENGTH", label: "Strength building" },
  { value: "ATTRIBUTE_CHARISMA", label: "Charisma building" },
  { value: "ATTRIBUTE_ENDURANCE", label: "Endurance building" },
  { value: "ATTRIBUTE_INTELLIGENCE", label: "Intelligence building" },
  { value: "PLAYER", label: "Place selected player" },
  { value: "TOWER_TEAM_A", label: "Tower: team A" },
  { value: "TOWER_TEAM_B", label: "Tower: team B" },
  { value: "MOVE", label: "Move object (two clicks)" },
  { value: "DELETE_OBJECT", label: "Delete object" },
];

function cloneMap(value: CivilizationAdminMapInput): CivilizationAdminMapInput {
  return structuredClone(value);
}

function sideFromTool(tool: EditorTool): CivilizationTeamSide | null {
  if (tool.endsWith("TEAM_A")) {
    return "TEAM_A";
  }
  if (tool.endsWith("TEAM_B")) {
    return "TEAM_B";
  }
  return null;
}

function ensureGround(map: CivilizationAdminMapInput, coordinate: HexCoordinate): void {
  const existing = map.tiles.find((tile) => coordinateKey(tile) === coordinateKey(coordinate));
  if (existing) {
    existing.terrainType = "GROUND";
    return;
  }
  map.tiles.push({ ...coordinate, terrainType: "GROUND", ownerTeamSide: null });
}

function removeObjectsAt(map: CivilizationAdminMapInput, coordinate: HexCoordinate): void {
  const key = coordinateKey(coordinate);
  map.buildings = map.buildings.filter((item) => coordinateKey(item) !== key);
  map.spawnPoints = map.spawnPoints.filter((item) => coordinateKey(item) !== key);
  map.playerPlacements = map.playerPlacements.filter((item) => coordinateKey(item) !== key);
  map.towers = map.towers.filter((item) => coordinateKey(item) !== key);
}

function applyPaintingTool(
  current: CivilizationAdminMapInput,
  coordinate: HexCoordinate,
  tool: EditorTool,
  selectedUserId: string,
  selectedSpawnKey: string,
  teams: CivilizationAdminGameInput["teams"],
  settings: CivilizationSettings,
): CivilizationAdminMapInput {
  const map = cloneMap(current);
  const key = coordinateKey(coordinate);
  const tile = map.tiles.find((item) => coordinateKey(item) === key);

  if (tool === "TOGGLE_HEX") {
    if (tile) {
      map.tiles = map.tiles.filter((item) => coordinateKey(item) !== key);
      removeObjectsAt(map, coordinate);
    } else {
      ensureGround(map, coordinate);
    }
    return map;
  }

  if (tool === "DELETE_OBJECT") {
    removeObjectsAt(map, coordinate);
    return map;
  }

  ensureGround(map, coordinate);
  const ensuredTile = map.tiles.find((item) => coordinateKey(item) === key)!;

  if (tool === "GROUND") {
    ensuredTile.terrainType = "GROUND";
  } else if (tool === "MOUNTAIN") {
    ensuredTile.terrainType = "MOUNTAIN";
    ensuredTile.ownerTeamSide = null;
    removeObjectsAt(map, coordinate);
  } else if (tool === "OWNER_TEAM_A" || tool === "OWNER_TEAM_B") {
    ensuredTile.ownerTeamSide = sideFromTool(tool);
  } else if (tool === "OWNER_NEUTRAL") {
    ensuredTile.ownerTeamSide = null;
  } else if (tool.startsWith("TOWN_HALL_")) {
    const side = sideFromTool(tool)!;
    map.buildings = map.buildings.filter(
      (item) =>
        !(item.type === "TOWN_HALL" && item.ownerTeamSide === side) && coordinateKey(item) !== key,
    );
    map.towers = map.towers.filter((item) => coordinateKey(item) !== key);
    map.buildings.push({
      ...coordinate,
      type: "TOWN_HALL",
      ownerTeamSide: side,
      attributeKey: null,
      incomePerHour: "0",
      captureRequiredUnits: settings.townHall.captureRequiredUnits,
    });
    ensuredTile.ownerTeamSide = side;
  } else if (tool.startsWith("SPAWN_")) {
    const side = sideFromTool(tool)!;
    const alreadyExists = map.spawnPoints.some(
      (item) => item.teamSide === side && coordinateKey(item) === key,
    );
    map.spawnPoints = map.spawnPoints.filter(
      (item) => !(item.teamSide === side && coordinateKey(item) === key),
    );
    if (!alreadyExists) {
      map.spawnPoints.push({ ...coordinate, teamSide: side });
    }
  } else if (tool === "GOLD_BUILDING" || tool.startsWith("ATTRIBUTE_")) {
    const attributeKey = tool.startsWith("ATTRIBUTE_")
      ? (tool.slice("ATTRIBUTE_".length).toLowerCase() as CivilizationAttributeKey)
      : null;
    map.buildings = map.buildings.filter((item) => coordinateKey(item) !== key);
    map.towers = map.towers.filter((item) => coordinateKey(item) !== key);
    map.buildings.push({
      ...coordinate,
      type: attributeKey ? "ATTRIBUTE_BUILDING" : "GOLD_BUILDING",
      ownerTeamSide: null,
      attributeKey,
      incomePerHour: attributeKey
        ? settings.attributeBuildingIncomePerHour[attributeKey]
        : settings.goldBuildingIncomePerHour,
      captureRequiredUnits: settings.buildingCapture.requiredUnits,
    });
  } else if (tool === "PLAYER" && selectedUserId) {
    const team = teams.find((item) => item.playerIds.includes(selectedUserId));
    const spawn = team
      ? map.spawnPoints.find(
          (item) => item.teamSide === team.side && coordinateKey(item) === selectedSpawnKey,
        )
      : undefined;
    if (team && spawn) {
      map.playerPlacements = map.playerPlacements.filter((item) => item.userId !== selectedUserId);
      map.playerPlacements.push({
        ...coordinate,
        userId: selectedUserId,
        teamSide: team.side,
        spawn: { q: spawn.q, r: spawn.r },
      });
    }
  } else if (tool === "TOWER_TEAM_A" || tool === "TOWER_TEAM_B") {
    const side = sideFromTool(tool)!;
    map.buildings = map.buildings.filter((item) => coordinateKey(item) !== key);
    map.towers = map.towers.filter((item) => coordinateKey(item) !== key);
    map.towers.push({
      ...coordinate,
      teamSide: side,
      status: "ACTIVE",
      protectionRadius: settings.tower.protectionRadius,
    });
    ensuredTile.ownerTeamSide = side;
  }

  return map;
}

function moveObjects(
  current: CivilizationAdminMapInput,
  from: HexCoordinate,
  to: HexCoordinate,
): CivilizationAdminMapInput {
  const map = cloneMap(current);
  const sourceKey = coordinateKey(from);
  const sourceBuilding = map.buildings.find((item) => coordinateKey(item) === sourceKey);
  const sourceSpawn = map.spawnPoints.find((item) => coordinateKey(item) === sourceKey);
  const sourceTower = map.towers.find((item) => coordinateKey(item) === sourceKey);
  const hasSourceObject =
    Boolean(sourceBuilding || sourceSpawn || sourceTower) ||
    map.playerPlacements.some((item) => coordinateKey(item) === sourceKey);
  if (!hasSourceObject) {
    return current;
  }

  const targetTile = map.tiles.find((tile) => coordinateKey(tile) === coordinateKey(to));
  if (!targetTile || targetTile.terrainType === "MOUNTAIN") {
    return current;
  }
  removeObjectsAt(map, to);
  map.buildings = map.buildings.map((item) =>
    coordinateKey(item) === sourceKey ? { ...item, ...to } : item,
  );
  map.spawnPoints = map.spawnPoints.map((item) =>
    coordinateKey(item) === sourceKey ? { ...item, ...to } : item,
  );
  map.playerPlacements = map.playerPlacements.map((item) =>
    coordinateKey(item) === sourceKey
      ? { ...item, ...to }
      : sourceSpawn &&
          item.teamSide === sourceSpawn.teamSide &&
          coordinateKey(item.spawn) === sourceKey
        ? { ...item, spawn: { ...to } }
        : item,
  );
  map.towers = map.towers.map((item) =>
    coordinateKey(item) === sourceKey ? { ...item, ...to } : item,
  );
  if (sourceBuilding?.ownerTeamSide) {
    targetTile.ownerTeamSide = sourceBuilding.ownerTeamSide;
  } else if (sourceTower) {
    targetTile.ownerTeamSide = sourceTower.teamSide;
  }
  return map;
}

function mirrorCoordinate({ q, r }: HexCoordinate): HexCoordinate {
  return { q: -q, r: q + r };
}

function mirrorMap(current: CivilizationAdminMapInput): CivilizationAdminMapInput {
  const map = cloneMap(current);
  const existingTiles = new Set(map.tiles.map(coordinateKey));
  current.tiles.forEach((tile) => {
    const mirrored = mirrorCoordinate(tile);
    if (!existingTiles.has(coordinateKey(mirrored))) {
      map.tiles.push({ ...tile, ...mirrored, ownerTeamSide: null });
    }
  });
  return map;
}

function textureFor(key: CivilizationAssetKey) {
  return safelyLoadPixiTexture(CIVILIZATION_ASSETS[key].path);
}

function mapRadius(value: CivilizationAdminMapInput): number {
  const furthest = value.tiles.reduce(
    (maximum, tile) => Math.max(maximum, hexDistance({ q: 0, r: 0 }, tile)),
    0,
  );
  return Math.min(25, Math.max(4, furthest + 2));
}

async function renderEditor(
  scene: EditorScene,
  map: CivilizationAdminMapInput,
  teams: CivilizationAdminGameInput["teams"],
  users: CivilizationMapEditorProps["users"],
  issues: CivilizationValidationIssue[],
  showValidation: boolean,
  preview: boolean,
  moveSource: HexCoordinate | null,
  onHexClick: (coordinate: HexCoordinate) => void,
): Promise<void> {
  const version = ++scene.renderVersion;
  clearPixiContainer(scene.gridLayer);
  clearPixiContainer(scene.objectLayer);
  clearPixiContainer(scene.validationLayer);

  const candidateCoordinates = createHexagonalMap(mapRadius(map));
  const layout = createHexLayout(candidateCoordinates);
  scene.viewport.resize(
    scene.app.renderer.width / scene.app.renderer.resolution,
    scene.app.renderer.height / scene.app.renderer.resolution,
    layout.width,
    layout.height,
  );
  const playable = new Map(map.tiles.map((tile) => [coordinateKey(tile), tile]));
  const colors: Record<CivilizationTeamSide, string> = {
    TEAM_A: teams[0].color,
    TEAM_B: teams[1].color,
  };

  candidateCoordinates.forEach((coordinate) => {
    const item = layout.items.get(coordinateKey(coordinate));
    if (!item) {
      return;
    }
    const tile = playable.get(coordinateKey(coordinate));
    const color = tile?.terrainType === "MOUNTAIN" ? "#334155" : "#263c32";
    const hex = new Graphics()
      .poly(item.corners, true)
      .fill({ color: tile ? color : "#0f172a", alpha: tile ? 1 : 0.3 })
      .stroke({
        color: tile ? "#64748b" : "#334155",
        width: tile ? 2 : 1,
        alpha: tile ? 0.9 : 0.45,
      });
    hex.eventMode = preview ? "none" : "static";
    hex.cursor = preview ? "default" : "crosshair";
    hex.on("pointertap", () => onHexClick(coordinate));
    scene.gridLayer.addChild(hex);
    if (tile?.ownerTeamSide) {
      scene.gridLayer.addChild(
        new Graphics()
          .poly(item.corners, true)
          .fill({ color: colors[tile.ownerTeamSide], alpha: 0.28 }),
      );
    }
    if (moveSource && coordinateKey(moveSource) === coordinateKey(coordinate)) {
      scene.validationLayer.addChild(
        new Graphics().poly(item.corners, true).stroke({ color: "#facc15", width: 5 }),
      );
    }
  });

  map.towers.forEach((tower) => {
    const radius = tower.protectionRadius ?? 0;
    candidateCoordinates.forEach((coordinate) => {
      if (hexDistance(tower, coordinate) > radius) return;
      const item = layout.items.get(coordinateKey(coordinate));
      if (!item) return;
      const coverage = new Graphics()
        .poly(item.corners, true)
        .fill({ color: colors[tower.teamSide], alpha: 0.06 })
        .stroke({ color: colors[tower.teamSide], width: 1, alpha: 0.35 });
      coverage.eventMode = "none";
      scene.gridLayer.addChild(coverage);
    });
  });

  const assetEntries: Array<{
    key: CivilizationAssetKey;
    coordinate: HexCoordinate;
    side: CivilizationTeamSide | null;
  }> = [];
  map.tiles
    .filter((tile) => tile.terrainType === "MOUNTAIN")
    .forEach((tile) => assetEntries.push({ key: "mountain", coordinate: tile, side: null }));
  map.buildings.forEach((building) => {
    const key: CivilizationAssetKey =
      building.type === "TOWN_HALL"
        ? "townHall"
        : building.type === "GOLD_BUILDING"
          ? "goldBuilding"
          : building.attributeKey
            ? `attributeBuilding.${building.attributeKey}`
            : "resource.neutral";
    assetEntries.push({ key, coordinate: building, side: building.ownerTeamSide });
  });
  map.spawnPoints.forEach((spawn) =>
    assetEntries.push({ key: "spawnPoint", coordinate: spawn, side: spawn.teamSide }),
  );
  map.towers.forEach((tower) =>
    assetEntries.push({
      key:
        tower.status === "DESTROYED"
          ? "tower.destroyed"
          : tower.status === "UNDER_CONSTRUCTION"
            ? "tower.underConstruction"
            : "tower.active",
      coordinate: tower,
      side: tower.teamSide,
    }),
  );
  const textures = await Promise.all(
    assetEntries.map(async (entry) => ({ ...entry, texture: await textureFor(entry.key) })),
  );
  if (version !== scene.renderVersion) {
    return;
  }
  textures.forEach((entry) => {
    const item = layout.items.get(coordinateKey(entry.coordinate));
    if (!item || !entry.texture) {
      return;
    }
    const sprite = new Sprite(entry.texture);
    sprite.anchor.set(0.5);
    sprite.position.set(item.center.x, item.center.y - 4);
    sprite.width = 58;
    sprite.height = 58;
    if (entry.side) {
      sprite.tint = colors[entry.side];
    }
    scene.objectLayer.addChild(sprite);
  });

  map.playerPlacements.forEach((placement) => {
    const item = layout.items.get(coordinateKey(placement));
    if (!item) {
      return;
    }
    const user = users.find((candidate) => candidate.id === placement.userId);
    const marker = new Graphics()
      .circle(item.center.x, item.center.y, 16)
      .fill({ color: colors[placement.teamSide] })
      .stroke({ color: "#ffffff", width: 2 });
    const label = new Text({
      text: user?.username.slice(0, 4) ?? "P",
      style: { fill: "#ffffff", fontFamily: "Arial", fontSize: 9, fontWeight: "700" },
    });
    label.anchor.set(0.5);
    label.position.set(item.center.x, item.center.y);
    scene.objectLayer.addChild(marker, label);
  });

  if (showValidation) {
    issues.forEach((validationIssue) => {
      if (!validationIssue.coordinate) {
        return;
      }
      const item = layout.items.get(coordinateKey(validationIssue.coordinate));
      if (item) {
        scene.validationLayer.addChild(
          new Graphics()
            .poly(item.corners, true)
            .fill({ color: "#ef4444", alpha: 0.18 })
            .stroke({ color: "#f87171", width: 5 }),
        );
      }
    });
  }

  if (!scene.initializedView) {
    scene.viewport.fitWorld(true);
    scene.viewport.setZoom(Math.min(scene.viewport.scaled, 1), true);
    scene.initializedView = true;
  }
}

export function CivilizationMapEditor({
  value,
  teams,
  settings,
  users,
  issues,
  disabled = false,
  onChange,
}: CivilizationMapEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EditorScene | null>(null);
  const historyRef = useRef<CivilizationAdminMapInput[]>([cloneMap(value)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);
  const [tool, setTool] = useState<EditorTool>("TOGGLE_HEX");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedSpawnKey, setSelectedSpawnKey] = useState("");
  const [preview, setPreview] = useState(false);
  const [showValidation, setShowValidation] = useState(true);
  const [moveSource, setMoveSource] = useState<HexCoordinate | null>(null);
  const [keyboardCoordinate, setKeyboardCoordinate] = useState<HexCoordinate>({ q: 0, r: 0 });
  const assignedUsers = useMemo(
    () => users.filter((user) => teams.some((team) => team.playerIds.includes(user.id))),
    [teams, users],
  );
  const selectedTeamSpawns = useMemo(() => {
    const selectedPlayerTeam = teams.find((team) => team.playerIds.includes(selectedUserId));
    return selectedPlayerTeam
      ? value.spawnPoints.filter((spawn) => spawn.teamSide === selectedPlayerTeam.side)
      : [];
  }, [selectedUserId, teams, value.spawnPoints]);
  const effectiveSelectedSpawnKey = selectedTeamSpawns.some(
    (spawn) => coordinateKey(spawn) === selectedSpawnKey,
  )
    ? selectedSpawnKey
    : selectedTeamSpawns[0]
      ? coordinateKey(selectedTeamSpawns[0])
      : "";
  const commit = useCallback(
    (next: CivilizationAdminMapInput): void => {
      const nextHistory = historyRef.current.slice(0, historyIndex + 1);
      nextHistory.push(cloneMap(next));
      historyRef.current = nextHistory.slice(-60);
      setHistoryIndex(historyRef.current.length - 1);
      setHistoryLength(historyRef.current.length);
      onChange(next);
    },
    [historyIndex, onChange],
  );

  const handleHexClick = useCallback(
    (coordinate: HexCoordinate): void => {
      if (disabled || preview) {
        return;
      }
      if (tool === "MOVE") {
        if (!moveSource) {
          setMoveSource(coordinate);
          return;
        }
        commit(moveObjects(value, moveSource, coordinate));
        setMoveSource(null);
        return;
      }
      commit(
        applyPaintingTool(
          value,
          coordinate,
          tool,
          selectedUserId,
          effectiveSelectedSpawnKey,
          teams,
          settings,
        ),
      );
    },
    [
      commit,
      disabled,
      moveSource,
      preview,
      effectiveSelectedSpawnKey,
      selectedUserId,
      settings,
      teams,
      tool,
      value,
    ],
  );

  const renderPropsRef = useRef({
    value,
    teams,
    users,
    issues,
    showValidation,
    preview,
    moveSource,
  });
  const handleHexClickRef = useRef(handleHexClick);

  useEffect(() => {
    renderPropsRef.current = {
      value,
      teams,
      users,
      issues,
      showValidation,
      preview,
      moveSource,
    };
    handleHexClickRef.current = handleHexClick;
  }, [handleHexClick, issues, moveSource, preview, showValidation, teams, users, value]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    const initialize = async (): Promise<void> => {
      const app = new Application();
      await app.init({
        antialias: true,
        background: "#07111f",
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
        width: Math.max(320, host.clientWidth),
        height: Math.max(520, host.clientHeight),
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
        threshold: 7,
      });
      viewport
        .drag()
        .pinch()
        .wheel({ smooth: 3 })
        .decelerate()
        .clamp({ direction: "all" })
        .clampZoom({ minScale: 0.25, maxScale: 2.5 });
      app.stage.addChild(viewport);
      const scene: EditorScene = {
        app,
        viewport,
        gridLayer: new Container({ label: "EditorGridLayer" }),
        objectLayer: new Container({ label: "EditorObjectLayer" }),
        validationLayer: new Container({ label: "EditorValidationLayer" }),
        renderVersion: 0,
        initializedView: false,
      };
      viewport.addChild(scene.gridLayer, scene.objectLayer, scene.validationLayer);
      sceneRef.current = scene;
      observer = new ResizeObserver(() => {
        const width = Math.max(320, host.clientWidth);
        const height = Math.max(520, host.clientHeight);
        app.renderer.resize(width, height);
        viewport.resize(width, height, viewport.worldWidth, viewport.worldHeight);
      });
      observer.observe(host);
      const current = renderPropsRef.current;
      await renderEditor(
        scene,
        current.value,
        current.teams,
        current.users,
        current.issues,
        current.showValidation,
        current.preview,
        current.moveSource,
        (coordinate) => handleHexClickRef.current(coordinate),
      );
    };
    void initialize();
    return () => {
      cancelled = true;
      observer?.disconnect();
      const scene = sceneRef.current;
      sceneRef.current = null;
      if (scene) {
        scene.renderVersion += 1;
      }
      scene?.app.destroy(true, { children: true });
      host.replaceChildren();
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (scene) {
      void renderEditor(
        scene,
        value,
        teams,
        users,
        issues,
        showValidation,
        preview,
        moveSource,
        handleHexClick,
      );
    }
  }, [handleHexClick, issues, moveSource, preview, showValidation, teams, users, value]);

  const undo = (): void => {
    if (historyIndex <= 0) {
      return;
    }
    const index = historyIndex - 1;
    setHistoryIndex(index);
    onChange(cloneMap(historyRef.current[index]!));
  };
  const redo = (): void => {
    if (historyIndex >= historyRef.current.length - 1) {
      return;
    }
    const index = historyIndex + 1;
    setHistoryIndex(index);
    onChange(cloneMap(historyRef.current[index]!));
  };
  const updateBuilding = (
    buildingIndex: number,
    patch: Partial<CivilizationAdminMapInput["buildings"][number]>,
  ): void => {
    const next = cloneMap(value);
    next.buildings[buildingIndex] = { ...next.buildings[buildingIndex]!, ...patch };
    commit(next);
  };
  const updateBuildingOwner = (
    buildingIndex: number,
    ownerTeamSide: CivilizationTeamSide | null,
  ): void => {
    const next = cloneMap(value);
    const building = next.buildings[buildingIndex];
    if (!building || building.type === "TOWN_HALL") {
      return;
    }

    building.ownerTeamSide = ownerTeamSide;
    if (ownerTeamSide) {
      const tile = next.tiles.find((item) => coordinateKey(item) === coordinateKey(building));
      if (tile) {
        tile.ownerTeamSide = ownerTeamSide;
      }
    }
    commit(next);
  };
  const updateTower = (
    towerIndex: number,
    patch: Partial<CivilizationAdminMapInput["towers"][number]>,
  ): void => {
    const next = cloneMap(value);
    next.towers[towerIndex] = { ...next.towers[towerIndex]!, ...patch };
    commit(next);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 border bg-muted/20 p-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-[10px]">
          Editor tool
          <select
            className="h-9 border bg-background px-3 text-xs"
            value={tool}
            disabled={disabled || preview}
            onChange={(event) => {
              setTool(event.target.value as EditorTool);
              setMoveSource(null);
            }}
          >
            {toolOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {tool === "PLAYER" ? (
          <label className="flex min-w-56 flex-1 flex-col gap-1 text-[10px]">
            Assigned player
            <select
              className="h-9 border bg-background px-3 text-xs"
              value={selectedUserId}
              onChange={(event) => {
                const userId = event.target.value;
                const team = teams.find((item) => item.playerIds.includes(userId));
                const spawn = value.spawnPoints.find((item) => item.teamSide === team?.side);
                setSelectedUserId(userId);
                setSelectedSpawnKey(spawn ? coordinateKey(spawn) : "");
              }}
            >
              <option value="">Select a player</option>
              {assignedUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {tool === "PLAYER" ? (
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-[10px]">
            Assigned spawn
            <select
              className="h-9 border bg-background px-3 text-xs"
              value={effectiveSelectedSpawnKey}
              disabled={!selectedUserId || selectedTeamSpawns.length === 0}
              onChange={(event) => setSelectedSpawnKey(event.target.value)}
            >
              <option value="">Select a team spawn</option>
              {selectedTeamSpawns.map((spawn) => {
                const key = coordinateKey(spawn);
                return (
                  <option key={key} value={key}>
                    {spawn.q}, {spawn.r}
                  </option>
                );
              })}
            </select>
          </label>
        ) : null}
        <label className="flex w-20 flex-col gap-1 text-[10px]">
          Hex q
          <input
            type="number"
            className="h-9 border bg-background px-2 text-xs"
            value={keyboardCoordinate.q}
            disabled={disabled || preview}
            onChange={(event) =>
              setKeyboardCoordinate((current) => ({
                ...current,
                q: Number.parseInt(event.target.value, 10) || 0,
              }))
            }
          />
        </label>
        <label className="flex w-20 flex-col gap-1 text-[10px]">
          Hex r
          <input
            type="number"
            className="h-9 border bg-background px-2 text-xs"
            value={keyboardCoordinate.r}
            disabled={disabled || preview}
            onChange={(event) =>
              setKeyboardCoordinate((current) => ({
                ...current,
                r: Number.parseInt(event.target.value, 10) || 0,
              }))
            }
          />
        </label>
        <Button
          type="button"
          variant="outline"
          className="self-end"
          disabled={disabled || preview}
          onClick={() => handleHexClick(keyboardCoordinate)}
        >
          Apply tool at hex
        </Button>
        <div className="flex items-end gap-2 self-end">
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled || historyIndex <= 0}
            onClick={undo}
          >
            <Undo2Icon className="size-4" />
            <span className="sr-only">Undo</span>
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            disabled={disabled || historyIndex >= historyLength - 1}
            onClick={redo}
          >
            <Redo2Icon className="size-4" />
            <span className="sr-only">Redo</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={() => commit(mirrorMap(value))}
          >
            <CopyIcon className="size-4" /> Mirror shape
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowValidation((current) => !current)}
          >
            {showValidation ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
            {showValidation ? "Hide errors" : "Show errors"}
          </Button>
          <Button
            type="button"
            variant={preview ? "default" : "outline"}
            onClick={() => setPreview((current) => !current)}
          >
            <EyeIcon className="size-4" /> {preview ? "Edit mode" : "Preview"}
          </Button>
          {moveSource ? (
            <Button type="button" variant="outline" onClick={() => setMoveSource(null)}>
              <RotateCcwIcon className="size-4" /> Cancel move
            </Button>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          "relative min-h-130 overflow-hidden border bg-slate-950",
          preview && "ring-2 ring-primary/40",
        )}
      >
        <div
          ref={hostRef}
          className="absolute inset-0 [&>canvas]:block"
          role="img"
          aria-label="Civilization visual hex-map editor"
        />
        <div className="pointer-events-none absolute bottom-3 left-3 border border-white/20 bg-slate-950/85 px-3 py-2 text-[9px] text-slate-200">
          {preview
            ? "Preview mode: map editing is locked"
            : tool === "MOVE" && moveSource
              ? "Choose the destination hex"
              : "Click to paint · drag to pan · wheel or pinch to zoom"}
        </div>
      </div>
      {value.buildings.length > 0 || value.towers.length > 0 ? (
        <div className="space-y-3 border bg-muted/10 p-3">
          <div>
            <p className="text-xs font-semibold">Map object settings</p>
            <p className="mt-1 text-[9px] text-muted-foreground">
              Values are stored per object. Global balance values seed newly placed objects.
              Assigning a resource building to a team also assigns its hex to that team.
            </p>
          </div>
          {value.buildings.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {value.buildings.map((building, index) => (
                <fieldset
                  key={`${building.id ?? building.type}:${building.q}:${building.r}:${index}`}
                  className="grid grid-cols-2 gap-2 border p-2 text-[9px]"
                  disabled={disabled}
                >
                  <legend className="px-1 text-[10px]">
                    {building.type} ({building.q}, {building.r})
                  </legend>
                  {building.type !== "TOWN_HALL" ? (
                    <label className="col-span-2 flex flex-col gap-1">
                      Initial owner
                      <select
                        className="h-8 border bg-background px-2"
                        value={building.ownerTeamSide ?? ""}
                        disabled={disabled}
                        onChange={(event) =>
                          updateBuildingOwner(
                            index,
                            event.target.value
                              ? (event.target.value as CivilizationTeamSide)
                              : null,
                          )
                        }
                      >
                        <option value="">Neutral</option>
                        <option value="TEAM_A">{teams[0].name} (Team A)</option>
                        <option value="TEAM_B">{teams[1].name} (Team B)</option>
                      </select>
                    </label>
                  ) : null}
                  <label className="flex flex-col gap-1">
                    Income / hour
                    <input
                      type="text"
                      inputMode="decimal"
                      className="h-8 border bg-background px-2"
                      value={building.incomePerHour}
                      disabled={disabled || building.type === "TOWN_HALL"}
                      onChange={(event) =>
                        updateBuilding(index, { incomePerHour: event.target.value })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    Capture units
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="h-8 border bg-background px-2"
                      value={building.captureRequiredUnits}
                      disabled={disabled}
                      onChange={(event) =>
                        updateBuilding(index, {
                          captureRequiredUnits: Number.parseInt(event.target.value, 10) || 0,
                        })
                      }
                    />
                  </label>
                </fieldset>
              ))}
            </div>
          ) : null}
          {value.towers.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {value.towers.map((tower, index) => (
                <label
                  key={`${tower.teamSide}:${tower.q}:${tower.r}:${index}`}
                  className="flex items-center justify-between gap-3 border p-2 text-[9px]"
                >
                  <span>
                    {tower.teamSide} tower ({tower.q}, {tower.r}) radius
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    className="h-8 w-20 border bg-background px-2"
                    value={tower.protectionRadius ?? settings.tower.protectionRadius}
                    disabled={disabled}
                    onChange={(event) =>
                      updateTower(index, {
                        protectionRadius: Number.parseInt(event.target.value, 10) || 0,
                      })
                    }
                  />
                </label>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex flex-wrap justify-between gap-2 text-[9px] text-muted-foreground">
        <span>
          {value.tiles.length} playable hexes · {value.buildings.length} buildings ·{" "}
          {value.spawnPoints.length} spawns · {value.playerPlacements.length} players
        </span>
        <span className={issues.length > 0 ? "text-destructive" : "text-emerald-400"}>
          {issues.length > 0 ? `${issues.length} validation issues` : "Local map checks passed"}
        </span>
      </div>
    </div>
  );
}
