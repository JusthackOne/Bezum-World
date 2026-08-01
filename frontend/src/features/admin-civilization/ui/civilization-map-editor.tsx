"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Application, Container, Graphics, Polygon, Sprite } from "pixi.js";
import { Viewport } from "pixi-viewport";
import {
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  Redo2Icon,
  RotateCcwIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react";

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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
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
  | "SPAWN"
  | "GOLD_BUILDING"
  | `ATTRIBUTE_${Uppercase<CivilizationAttributeKey>}`
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
  { value: "SPAWN", label: "Shared player spawn" },
  { value: "GOLD_BUILDING", label: "Gold building" },
  { value: "ATTRIBUTE_STRENGTH", label: "Strength building" },
  { value: "ATTRIBUTE_CHARISMA", label: "Charisma building" },
  { value: "ATTRIBUTE_ENDURANCE", label: "Endurance building" },
  { value: "ATTRIBUTE_INTELLIGENCE", label: "Intelligence building" },
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
  map.towers = map.towers.filter((item) => coordinateKey(item) !== key);
}

function hasMovableObjectAt(map: CivilizationAdminMapInput, coordinate: HexCoordinate): boolean {
  const key = coordinateKey(coordinate);
  return (
    map.buildings.some((item) => coordinateKey(item) === key) ||
    coordinateKey(map.spawn) === key ||
    map.towers.some((item) => coordinateKey(item) === key)
  );
}

function applyPaintingTool(
  current: CivilizationAdminMapInput,
  coordinate: HexCoordinate,
  tool: EditorTool,
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
    if (coordinateKey(map.spawn) === key) return current;
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
  } else if (tool === "SPAWN") {
    map.buildings = map.buildings.filter((item) => coordinateKey(item) !== key);
    map.towers = map.towers.filter((item) => coordinateKey(item) !== key);
    map.spawn = { ...coordinate };
  } else if (tool === "GOLD_BUILDING" || tool.startsWith("ATTRIBUTE_")) {
    if (coordinateKey(map.spawn) === key) return current;
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
  } else if (tool === "TOWER_TEAM_A" || tool === "TOWER_TEAM_B") {
    if (coordinateKey(map.spawn) === key) return current;
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
  const sourceIsSpawn = coordinateKey(map.spawn) === sourceKey;
  const sourceTower = map.towers.find((item) => coordinateKey(item) === sourceKey);
  if (!hasMovableObjectAt(map, from)) {
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
  if (sourceIsSpawn) map.spawn = { ...to };
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
  issues: CivilizationValidationIssue[],
  showValidation: boolean,
  preview: boolean,
  moveSource: HexCoordinate | null,
): Promise<void> {
  const version = ++scene.renderVersion;
  clearPixiContainer(scene.gridLayer);
  clearPixiContainer(scene.objectLayer);
  clearPixiContainer(scene.validationLayer);

  const candidateCoordinates = createHexagonalMap(mapRadius(map));
  const layout = createHexLayout(candidateCoordinates);
  scene.viewport.resize(
    scene.app.renderer.screen.width,
    scene.app.renderer.screen.height,
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
    hex.eventMode = "none";
    scene.gridLayer.addChild(hex);

    if (tile?.ownerTeamSide) {
      const ownership = new Graphics()
        .poly(item.corners, true)
        .fill({ color: colors[tile.ownerTeamSide], alpha: 0.28 });
      ownership.eventMode = "none";
      scene.gridLayer.addChild(ownership);
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
  assetEntries.push({ key: "spawnPoint", coordinate: map.spawn, side: null });
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
    sprite.eventMode = "none";
    sprite.anchor.set(0.5);
    sprite.position.set(item.center.x, item.center.y - 4);
    sprite.width = 58;
    sprite.height = 58;
    if (entry.side) {
      sprite.tint = colors[entry.side];
    }
    scene.objectLayer.addChild(sprite);
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
  issues,
  disabled = false,
  onChange,
}: CivilizationMapEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<EditorScene | null>(null);
  const pointerDownRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const historyRef = useRef<CivilizationAdminMapInput[]>([cloneMap(value)]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);
  const [tool, setTool] = useState<EditorTool>("TOGGLE_HEX");
  const [preview, setPreview] = useState(false);
  const [showValidation, setShowValidation] = useState(true);
  const [moveSource, setMoveSource] = useState<HexCoordinate | null>(null);
  const [clearConfirmationOpen, setClearConfirmationOpen] = useState(false);
  const hasMapContent =
    value.tiles.length > 0 || value.buildings.length > 0 || value.towers.length > 0;
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
          if (hasMovableObjectAt(value, coordinate)) {
            setMoveSource(coordinate);
          }
          return;
        }
        const next = moveObjects(value, moveSource, coordinate);
        if (next === value) {
          return;
        }
        commit(next);
        setMoveSource(null);
        return;
      }
      const next = applyPaintingTool(value, coordinate, tool, settings);
      if (next !== value) {
        commit(next);
      }
    },
    [commit, disabled, moveSource, preview, settings, tool, value],
  );

  const renderPropsRef = useRef({
    value,
    teams,
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
      issues,
      showValidation,
      preview,
      moveSource,
    };
    handleHexClickRef.current = handleHexClick;
  }, [handleHexClick, issues, moveSource, preview, showValidation, teams, value]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let ownedScene: EditorScene | null = null;
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
        passiveWheel: false,
        stopPropagation: true,
      });
      viewport
        .drag({ mouseButtons: "left" })
        .pinch()
        .wheel({ percent: 0.12, smooth: false, trackpadPinch: true })
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
      scene.objectLayer.eventMode = "none";
      scene.validationLayer.eventMode = "none";
      ownedScene = scene;
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
        current.issues,
        current.showValidation,
        current.preview,
        current.moveSource,
      );
    };
    void initialize();
    return () => {
      cancelled = true;
      observer?.disconnect();
      const scene = ownedScene;
      if (sceneRef.current === scene) {
        sceneRef.current = null;
      }
      if (scene) {
        scene.renderVersion += 1;
        scene.app.stage.removeChild(scene.viewport);
        scene.viewport.destroy({ children: true });
        scene.app.destroy(true, { children: true });
      }
      host.replaceChildren();
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (scene) {
      void renderEditor(scene, value, teams, issues, showValidation, preview, moveSource);
    }
  }, [handleHexClick, issues, moveSource, preview, showValidation, teams, value]);

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
  const handleMapPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0 || !event.isPrimary) {
      return;
    }
    pointerDownRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  };
  const handleMapPointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const pointerDown = pointerDownRef.current;
    pointerDownRef.current = null;
    if (
      !pointerDown ||
      pointerDown.pointerId !== event.pointerId ||
      Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 7
    ) {
      return;
    }

    const host = hostRef.current;
    const scene = sceneRef.current;
    if (!host || !scene) {
      return;
    }
    const bounds = host.getBoundingClientRect();
    const screenWidth = scene.app.renderer.screen.width;
    const screenHeight = scene.app.renderer.screen.height;
    const worldPoint = scene.viewport.toWorld(
      ((event.clientX - bounds.left) / bounds.width) * screenWidth,
      ((event.clientY - bounds.top) / bounds.height) * screenHeight,
    );
    const layout = createHexLayout(createHexagonalMap(mapRadius(renderPropsRef.current.value)));
    const coordinate = [...layout.items.values()].find((item) =>
      new Polygon(item.corners).contains(worldPoint.x, worldPoint.y),
    )?.coordinate;
    if (coordinate) {
      handleHexClickRef.current(coordinate);
    }
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
        <div className="flex flex-wrap items-end gap-2 self-end">
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
            variant="destructive"
            disabled={disabled || preview || !hasMapContent}
            onClick={() => setClearConfirmationOpen(true)}
          >
            <Trash2Icon className="size-4" /> Clear map
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
          "relative min-h-130 touch-none overflow-hidden overscroll-contain border bg-slate-950 select-none",
          preview && "ring-2 ring-primary/40",
        )}
      >
        <div
          ref={hostRef}
          className="absolute inset-0 cursor-crosshair [&>canvas]:block [&>canvas]:touch-none [&>canvas]:overscroll-contain"
          role="img"
          aria-label="Civilization visual hex-map editor"
          onPointerDown={handleMapPointerDown}
          onPointerUp={handleMapPointerUp}
          onPointerCancel={() => {
            pointerDownRef.current = null;
          }}
        />
        <div className="pointer-events-none absolute bottom-3 left-3 border border-white/20 bg-slate-950/85 px-3 py-2 text-[9px] text-slate-200">
          {preview
            ? "Preview mode: map editing is locked"
            : tool === "MOVE"
              ? moveSource
                ? "Choose the destination hex"
                : "Click an object to move it"
              : "Click to paint · left-drag to pan · wheel to zoom"}
        </div>
      </div>
      <AlertDialog open={clearConfirmationOpen} onOpenChange={setClearConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the entire map?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes every playable hex, building, and tower. The shared spawn remains
              configured and must be placed on a new playable hex before saving.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                commit({
                  tiles: [],
                  spawn: { ...value.spawn },
                  buildings: [],
                  towers: [],
                });
                setMoveSource(null);
              }}
            >
              Clear map
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
          {value.tiles.length} playable hexes · {value.buildings.length} buildings · 1 shared spawn
        </span>
        <span className={issues.length > 0 ? "text-destructive" : "text-emerald-400"}>
          {issues.length > 0 ? `${issues.length} validation issues` : "Local map checks passed"}
        </span>
      </div>
    </div>
  );
}
