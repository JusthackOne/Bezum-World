"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CoinsIcon, RotateCcwIcon, SparklesIcon } from "lucide-react";
import {
  Application,
  Assets,
  Container,
  Graphics,
  Rectangle,
  Sprite,
  Text,
  Texture,
} from "pixi.js";

const SYMBOL_ATLAS_URL = "/assets/slot-machine/rpg-symbols.png";
const BET = 25;
const INITIAL_CREDITS = 1_000;
const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 470;
const REEL_TOP = 91;
const REEL_HEIGHT = 285;
const SYMBOL_HEIGHT = 95;
const SYMBOL_SIZE = 82;

type SymbolId = "coin" | "crystal" | "sword" | "potion" | "crown" | "dragonEye";

interface SlotSymbol {
  id: SymbolId;
  label: string;
  shortLabel: string;
  payout: number;
  odds: string;
  accent: number;
  atlasColumn: number;
  atlasRow: number;
}

interface SpinRequest {
  id: number;
  result: [SymbolId, SymbolId, SymbolId];
  payout: number;
}

interface SpinHistoryEntry {
  id: number;
  result: [SymbolId, SymbolId, SymbolId];
  payout: number;
}

interface SlotSceneController {
  spin: (request: SpinRequest) => void;
}

const SLOT_SYMBOLS: SlotSymbol[] = [
  {
    id: "coin",
    label: "Star Coin",
    shortLabel: "COIN",
    payout: 30,
    odds: "22%",
    accent: 0xfacc15,
    atlasColumn: 0,
    atlasRow: 0,
  },
  {
    id: "potion",
    label: "Heart Elixir",
    shortLabel: "ELIXIR",
    payout: 45,
    odds: "18%",
    accent: 0xfb4f67,
    atlasColumn: 0,
    atlasRow: 1,
  },
  {
    id: "sword",
    label: "Hero Blade",
    shortLabel: "BLADE",
    payout: 75,
    odds: "12%",
    accent: 0x67e8f9,
    atlasColumn: 2,
    atlasRow: 0,
  },
  {
    id: "crystal",
    label: "Mana Crystal",
    shortLabel: "CRYSTAL",
    payout: 120,
    odds: "7%",
    accent: 0x38bdf8,
    atlasColumn: 1,
    atlasRow: 0,
  },
  {
    id: "crown",
    label: "Royal Crown",
    shortLabel: "CROWN",
    payout: 250,
    odds: "4%",
    accent: 0xf59e0b,
    atlasColumn: 1,
    atlasRow: 1,
  },
  {
    id: "dragonEye",
    label: "Dragon Eye",
    shortLabel: "JACKPOT",
    payout: 500,
    odds: "2%",
    accent: 0xd946ef,
    atlasColumn: 2,
    atlasRow: 1,
  },
];

const SYMBOL_BY_ID = Object.fromEntries(
  SLOT_SYMBOLS.map((symbol) => [symbol.id, symbol]),
) as Record<SymbolId, SlotSymbol>;

const SYMBOL_INDEX = Object.fromEntries(
  SLOT_SYMBOLS.map((symbol, index) => [symbol.id, index]),
) as Record<SymbolId, number>;

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function randomLoss(): [SymbolId, SymbolId, SymbolId] {
  const shuffled = [...SLOT_SYMBOLS].sort(() => Math.random() - 0.5);
  return [shuffled[0].id, shuffled[1].id, shuffled[2].id];
}

function createRandomOutcome(): { result: [SymbolId, SymbolId, SymbolId]; payout: number } {
  const roll = Math.random() * 100;
  let cumulativeChance = 0;
  const winChances: Array<[SymbolId, number]> = [
    ["dragonEye", 2],
    ["crown", 4],
    ["crystal", 7],
    ["sword", 12],
    ["potion", 18],
    ["coin", 22],
  ];

  for (const [symbolId, chance] of winChances) {
    cumulativeChance += chance;
    if (roll < cumulativeChance) {
      return {
        result: [symbolId, symbolId, symbolId],
        payout: SYMBOL_BY_ID[symbolId].payout,
      };
    }
  }

  return { result: randomLoss(), payout: 0 };
}

function atlasFrame(symbol: SlotSymbol): Rectangle {
  const xPositions = [12, 424, 836];
  const yPositions = [140, 590];
  return new Rectangle(xPositions[symbol.atlasColumn], yPositions[symbol.atlasRow], 406, 440);
}

function SymbolThumbnail({ symbol }: { symbol: SlotSymbol }) {
  const backgroundPositionX = ["0%", "50%", "100%"] as const;
  const backgroundPositionY = ["14%", "79%"] as const;

  return (
    <span
      aria-hidden="true"
      className="block size-11 shrink-0 border border-white/10 bg-[#05081d] bg-no-repeat shadow-[inset_0_0_12px_rgba(129,92,246,.2)]"
      style={{
        backgroundImage: `url(${SYMBOL_ATLAS_URL})`,
        backgroundPosition: `${backgroundPositionX[symbol.atlasColumn]} ${backgroundPositionY[symbol.atlasRow]}`,
        backgroundSize: "300% 285%",
      }}
    />
  );
}

function PixiSlotMachine({
  request,
  onSpinFinished,
}: {
  request: SpinRequest | null;
  onSpinFinished: (request: SpinRequest) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SlotSceneController | null>(null);
  const pendingRequestRef = useRef<SpinRequest | null>(null);
  const onSpinFinishedRef = useRef(onSpinFinished);

  useEffect(() => {
    onSpinFinishedRef.current = onSpinFinished;
  }, [onSpinFinished]);

  useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    if (!host) return;

    const app = new Application();
    const cleanupCallbacks: Array<() => void> = [];

    async function initializeScene() {
      await app.init({
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        preference: "webgl",
      });

      if (disposed || !host) {
        app.destroy(true);
        return;
      }

      app.canvas.setAttribute("aria-label", "Three-reel fantasy slot machine");
      app.canvas.setAttribute("role", "img");
      app.canvas.className = "block h-auto w-full";
      host.replaceChildren(app.canvas);

      const atlas = await Assets.load<Texture>(SYMBOL_ATLAS_URL);
      if (disposed) return;

      const symbolTextures = Object.fromEntries(
        SLOT_SYMBOLS.map((symbol) => [
          symbol.id,
          new Texture({ source: atlas.source, frame: atlasFrame(symbol) }),
        ]),
      ) as Record<SymbolId, Texture>;

      const backdrop = new Graphics()
        .roundRect(12, 10, 736, 444, 28)
        .fill({ color: 0x07091c, alpha: 0.98 })
        .stroke({ color: 0x8b5cf6, width: 3, alpha: 0.7 });
      app.stage.addChild(backdrop);

      const innerGlow = new Graphics()
        .roundRect(24, 22, 712, 420, 22)
        .stroke({ color: 0x22d3ee, width: 1, alpha: 0.3 });
      app.stage.addChild(innerGlow);

      const title = new Text({
        text: "ARCANE RELIQUARY",
        style: {
          fontFamily: "monospace",
          fontSize: 24,
          fontWeight: "800",
          fill: 0xfef3c7,
          letterSpacing: 5,
          dropShadow: { color: 0xa855f7, blur: 8, distance: 0, alpha: 0.9 },
        },
      });
      title.anchor.set(0.5);
      title.position.set(CANVAS_WIDTH / 2, 52);
      app.stage.addChild(title);

      const machineFrame = new Graphics()
        .roundRect(55, 75, 650, 318, 18)
        .fill({ color: 0x14162f, alpha: 1 })
        .stroke({ color: 0xfbbf24, width: 4, alpha: 0.9 });
      app.stage.addChild(machineFrame);

      const reelLayer = new Container();

      const reelPositions = [0, 2, 4];
      const reelContainers: Container[] = [];
      const reelSprites: Sprite[][] = [];
      const reelXPositions = [82, 288, 494];

      for (let reelIndex = 0; reelIndex < 3; reelIndex += 1) {
        const reelBackground = new Graphics()
          .roundRect(reelXPositions[reelIndex], REEL_TOP, 184, REEL_HEIGHT, 10)
          .fill({ color: 0x030617, alpha: 1 })
          .stroke({ color: 0x475569, width: 2, alpha: 0.8 });
        app.stage.addChild(reelBackground);

        const reel = new Container();
        const mask = new Graphics()
          .roundRect(reelXPositions[reelIndex], REEL_TOP, 184, REEL_HEIGHT, 10)
          .fill(0xffffff);
        reelLayer.addChild(mask);
        reel.mask = mask;
        reelLayer.addChild(reel);
        reelContainers.push(reel);

        const sprites: Sprite[] = [];
        for (let slotIndex = -1; slotIndex <= 3; slotIndex += 1) {
          const sprite = new Sprite(symbolTextures.coin);
          sprite.anchor.set(0.5);
          sprite.position.x = reelXPositions[reelIndex] + 92;
          reel.addChild(sprite);
          sprites.push(sprite);
        }
        reelSprites.push(sprites);
      }
      app.stage.addChild(reelLayer);

      const paylineGlow = new Graphics()
        .roundRect(62, REEL_TOP + SYMBOL_HEIGHT, 636, SYMBOL_HEIGHT, 8)
        .fill({ color: 0xfbbf24, alpha: 0.055 })
        .stroke({ color: 0xfbbf24, width: 3, alpha: 0.85 });
      app.stage.addChild(paylineGlow);

      const paylineLeft = new Graphics().poly([48, 222, 66, 233, 48, 244]).fill(0xfbbf24);
      const paylineRight = new Graphics().poly([712, 222, 694, 233, 712, 244]).fill(0xfbbf24);
      app.stage.addChild(paylineLeft, paylineRight);

      const footerText = new Text({
        text: "MATCH 3 RELICS  •  CENTER PAYLINE",
        style: {
          fontFamily: "monospace",
          fontSize: 12,
          fontWeight: "700",
          fill: 0x94a3b8,
          letterSpacing: 1,
        },
      });
      footerText.anchor.set(0.5);
      footerText.position.set(CANVAS_WIDTH / 2, 421);
      app.stage.addChild(footerText);

      const fxLayer = new Container();
      app.stage.addChild(fxLayer);

      function renderReel(reelIndex: number) {
        const position = reelPositions[reelIndex];
        const baseIndex = Math.floor(position);
        const fraction = position - baseIndex;

        reelSprites[reelIndex].forEach((sprite, spriteIndex) => {
          const relativeIndex = spriteIndex - 1;
          const symbolIndex =
            (((baseIndex + relativeIndex) % SLOT_SYMBOLS.length) + SLOT_SYMBOLS.length) %
            SLOT_SYMBOLS.length;
          sprite.texture = symbolTextures[SLOT_SYMBOLS[symbolIndex].id];
          sprite.width = SYMBOL_SIZE;
          sprite.height = SYMBOL_SIZE;
          sprite.position.y =
            REEL_TOP + SYMBOL_HEIGHT / 2 + (relativeIndex - fraction) * SYMBOL_HEIGHT;
          sprite.alpha = relativeIndex === 1 ? 1 : 0.58;
        });
      }

      for (let reelIndex = 0; reelIndex < 3; reelIndex += 1) renderReel(reelIndex);

      function playResultEffect(request: SpinRequest) {
        const isWin = request.payout > 0;
        const effectStart = performance.now();
        const effectDuration = isWin ? 2_100 : 850;
        const centerSprites = reelSprites.map((sprites) => sprites[2]);
        const particleData: Array<{
          graphic: Graphics;
          velocityX: number;
          velocityY: number;
          rotationSpeed: number;
        }> = [];

        const banner = new Text({
          text: isWin ? `+${request.payout} GOLD` : "NO MATCH",
          style: {
            fontFamily: "monospace",
            fontSize: isWin ? 34 : 25,
            fontWeight: "900",
            fill: isWin ? 0xfef08a : 0x94a3b8,
            stroke: { color: 0x020617, width: 7 },
            dropShadow: isWin ? { color: 0xf59e0b, blur: 14, distance: 0, alpha: 1 } : undefined,
            letterSpacing: 3,
          },
        });
        banner.anchor.set(0.5);
        banner.position.set(CANVAS_WIDTH / 2, 232);
        banner.alpha = 0;
        fxLayer.addChild(banner);

        if (isWin) {
          const winningSymbol = SYMBOL_BY_ID[request.result[0]];
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const particleCount = reducedMotion ? 12 : 58;

          for (let index = 0; index < particleCount; index += 1) {
            const size = 3 + Math.random() * 6;
            const particle = new Graphics()
              .rect(-size / 2, -size / 2, size, size)
              .fill(index % 3 === 0 ? 0xfde047 : winningSymbol.accent);
            particle.position.set(CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 260, 240);
            fxLayer.addChild(particle);
            particleData.push({
              graphic: particle,
              velocityX: (Math.random() - 0.5) * 9,
              velocityY: -4 - Math.random() * 8,
              rotationSpeed: (Math.random() - 0.5) * 0.35,
            });
          }
        }

        const effectTicker = () => {
          const elapsed = performance.now() - effectStart;
          const progress = Math.min(elapsed / effectDuration, 1);
          banner.alpha = Math.min(1, progress * 7) * (progress > 0.78 ? (1 - progress) / 0.22 : 1);
          banner.scale.set(0.65 + Math.min(progress * 3, 1) * 0.35);

          if (isWin) {
            const pulse = 1 + Math.sin(progress * Math.PI * 10) * 0.08 * (1 - progress);
            centerSprites.forEach((sprite) =>
              sprite.scale.set(pulse * (SYMBOL_SIZE / 406), pulse * (SYMBOL_SIZE / 440)),
            );
            paylineGlow.alpha = 0.7 + Math.sin(progress * Math.PI * 12) * 0.25;
            app.stage.position.x = Math.sin(progress * Math.PI * 18) * 3 * (1 - progress);

            particleData.forEach((particle) => {
              particle.velocityY += 0.24;
              particle.graphic.position.x += particle.velocityX;
              particle.graphic.position.y += particle.velocityY;
              particle.graphic.rotation += particle.rotationSpeed;
              particle.graphic.alpha = Math.max(0, 1 - progress * 0.85);
            });
          }

          if (progress >= 1) {
            app.ticker.remove(effectTicker);
            centerSprites.forEach((sprite) => {
              sprite.width = SYMBOL_SIZE;
              sprite.height = SYMBOL_SIZE;
            });
            paylineGlow.alpha = 1;
            app.stage.position.x = 0;
            fxLayer.removeChildren().forEach((child) => child.destroy());
            onSpinFinishedRef.current(request);
          }
        };

        app.ticker.add(effectTicker);
        cleanupCallbacks.push(() => app.ticker.remove(effectTicker));
      }

      let activeSpin = false;

      function spin(requestToPlay: SpinRequest) {
        if (activeSpin || disposed) return;
        activeSpin = true;
        const startTime = performance.now();
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const durations = reducedMotion ? [450, 550, 650] : [1_850, 2_250, 2_650];
        const starts = [...reelPositions];
        const ends = requestToPlay.result.map((symbolId, reelIndex) => {
          const targetRemainder =
            (SYMBOL_INDEX[symbolId] - 1 + SLOT_SYMBOLS.length) % SLOT_SYMBOLS.length;
          let candidate = Math.ceil(starts[reelIndex]) + 18 + reelIndex * 6;
          while (candidate % SLOT_SYMBOLS.length !== targetRemainder) candidate += 1;
          return candidate;
        });

        const spinTicker = () => {
          const elapsed = performance.now() - startTime;
          let allFinished = true;

          for (let reelIndex = 0; reelIndex < 3; reelIndex += 1) {
            const progress = Math.min(elapsed / durations[reelIndex], 1);
            if (progress < 1) allFinished = false;
            const eased = easeInOutCubic(progress);
            const bounce = Math.sin(progress * Math.PI * 2) * 0.035 * (1 - progress);
            reelPositions[reelIndex] =
              starts[reelIndex] + (ends[reelIndex] - starts[reelIndex]) * eased + bounce;
            renderReel(reelIndex);
          }

          if (allFinished) {
            app.ticker.remove(spinTicker);
            ends.forEach((end, reelIndex) => {
              reelPositions[reelIndex] = end;
              renderReel(reelIndex);
            });
            activeSpin = false;
            playResultEffect(requestToPlay);
          }
        };

        app.ticker.add(spinTicker);
        cleanupCallbacks.push(() => app.ticker.remove(spinTicker));
      }

      controllerRef.current = { spin };
      if (pendingRequestRef.current) {
        spin(pendingRequestRef.current);
        pendingRequestRef.current = null;
      }
    }

    void initializeScene().catch((error: unknown) => {
      console.error("Failed to initialize PixiJS slot machine", error);
      if (!disposed && host) {
        host.replaceChildren();
        const errorMessage = document.createElement("p");
        errorMessage.className =
          "flex h-full items-center justify-center px-6 text-center text-xs leading-6 text-red-300";
        errorMessage.textContent = "PixiJS scene could not be loaded. Check the browser console.";
        host.appendChild(errorMessage);
      }
    });

    return () => {
      disposed = true;
      controllerRef.current = null;
      cleanupCallbacks.forEach((cleanup) => cleanup());
      app.destroy(true, { children: true, texture: true });
    };
  }, []);

  useEffect(() => {
    if (!request) return;
    if (controllerRef.current) controllerRef.current.spin(request);
    else pendingRequestRef.current = request;
  }, [request]);

  return (
    <div
      ref={hostRef}
      className="aspect-[760/470] w-full overflow-hidden rounded-[1.25rem] bg-[radial-gradient(circle_at_50%_45%,rgba(109,40,217,.22),transparent_60%)]"
    >
      <div className="flex h-full items-center justify-center text-xs tracking-[0.22em] text-violet-200/60">
        LOADING RELICS...
      </div>
    </div>
  );
}

export default function SlotMachinePage() {
  const [credits, setCredits] = useState(INITIAL_CREDITS);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinRequest, setSpinRequest] = useState<SpinRequest | null>(null);
  const [history, setHistory] = useState<SpinHistoryEntry[]>([]);
  const [lastWin, setLastWin] = useState<number | null>(null);
  const requestIdRef = useRef(0);

  const startSpin = useCallback(
    (forcedSymbolId?: SymbolId) => {
      if (isSpinning || credits < BET) return;

      const outcome = forcedSymbolId
        ? {
            result: [forcedSymbolId, forcedSymbolId, forcedSymbolId] as [
              SymbolId,
              SymbolId,
              SymbolId,
            ],
            payout: SYMBOL_BY_ID[forcedSymbolId].payout,
          }
        : createRandomOutcome();

      requestIdRef.current += 1;
      setCredits((current) => current - BET);
      setLastWin(null);
      setIsSpinning(true);
      setSpinRequest({ id: requestIdRef.current, ...outcome });
    },
    [credits, isSpinning],
  );

  const handleSpinFinished = useCallback((completedSpin: SpinRequest) => {
    setCredits((current) => current + completedSpin.payout);
    setLastWin(completedSpin.payout);
    setHistory((current) => [completedSpin, ...current].slice(0, 5));
    setIsSpinning(false);
  }, []);

  const resetDemo = useCallback(() => {
    if (isSpinning) return;
    setCredits(INITIAL_CREDITS);
    setHistory([]);
    setLastWin(null);
  }, [isSpinning]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#040511] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(34,211,238,.13),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,.18),transparent_34%),radial-gradient(circle_at_50%_90%,rgba(245,158,11,.10),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative mx-auto w-full max-w-[1460px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.3em] text-cyan-300">
              <SparklesIcon className="size-4" /> BEZUM WORLD • UI LAB
            </div>
            <h1 className="text-xl leading-relaxed font-black tracking-[0.08em] text-amber-100 sm:text-2xl">
              ARCANE RELIQUARY
            </h1>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Автономный PixiJS-прототип. Никаких запросов к backend.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-10 items-center border border-cyan-400/20 bg-cyan-400/5 px-3 text-[9px] tracking-wider text-cyan-200/70">
              PIXIJS • WEBGL
            </span>
            <Link
              href="/"
              className="inline-flex h-10 items-center border border-violet-400/40 bg-violet-500/10 px-4 text-[10px] tracking-wider text-violet-200 transition hover:bg-violet-500/20"
            >
              BACK TO WORLD
            </Link>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="min-w-0">
            <div className="relative overflow-hidden rounded-3xl border border-violet-400/25 bg-[#090b20]/90 p-2 shadow-[0_0_80px_rgba(109,40,217,.16)] sm:p-4">
              <div className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent" />
              <PixiSlotMachine request={spinRequest} onSpinFinished={handleSpinFinished} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
              <div className="flex min-h-20 items-center justify-between border border-amber-400/25 bg-amber-400/5 px-4 py-3">
                <div>
                  <p className="text-[9px] tracking-[0.22em] text-amber-200/60">DEMO BALANCE</p>
                  <p className="mt-2 flex items-center gap-2 text-lg font-black text-amber-200">
                    <CoinsIcon className="size-5" /> {credits.toLocaleString("en-US")}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isSpinning}
                  onClick={resetDemo}
                  className="p-2 text-amber-200/60 transition hover:text-amber-100 disabled:opacity-30"
                  aria-label="Reset demo balance"
                >
                  <RotateCcwIcon className="size-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={isSpinning || credits < BET}
                onClick={() => startSpin()}
                className="group relative min-h-20 min-w-52 overflow-hidden border-2 border-amber-300 bg-gradient-to-b from-amber-300 to-amber-500 px-8 text-sm font-black tracking-[0.18em] text-[#211006] shadow-[0_6px_0_#92400e,0_0_28px_rgba(245,158,11,.28)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:grayscale disabled:hover:translate-y-0"
              >
                <span className="relative z-10">{isSpinning ? "SPINNING..." : "SPIN RELICS"}</span>
                <span className="relative z-10 mt-1 block text-[9px] tracking-[0.12em] opacity-70">
                  BET {BET} GOLD
                </span>
                <span className="absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-20deg] bg-white/35 transition-all duration-700 group-hover:left-[125%]" />
              </button>

              <div className="flex min-h-20 items-center justify-between border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 sm:text-right">
                <div className="w-full">
                  <p className="text-[9px] tracking-[0.22em] text-cyan-200/60">LAST RESULT</p>
                  <p
                    className={`mt-2 text-sm font-black ${lastWin && lastWin > 0 ? "text-amber-200" : "text-slate-400"}`}
                  >
                    {lastWin === null ? "READY" : lastWin > 0 ? `WIN +${lastWin} GOLD` : "NO MATCH"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 border border-white/10 bg-white/[0.025] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-[10px] tracking-[0.22em] text-slate-300">RECENT SPINS</h2>
                <span className="text-[9px] text-slate-500">LOCAL SESSION ONLY</span>
              </div>
              {history.length === 0 ? (
                <p className="py-3 text-center text-[10px] leading-5 text-slate-600">
                  История появится после первого вращения
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 border border-white/10 bg-[#090b20] px-3 py-2"
                    >
                      <div className="flex -space-x-1">
                        {entry.result.map((symbolId, index) => (
                          <SymbolThumbnail
                            key={`${entry.id}-${index}`}
                            symbol={SYMBOL_BY_ID[symbolId]}
                          />
                        ))}
                      </div>
                      <span
                        className={`text-[9px] ${entry.payout > 0 ? "text-amber-200" : "text-slate-500"}`}
                      >
                        {entry.payout > 0 ? `+${entry.payout}` : "MISS"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className="border border-violet-400/20 bg-[#090b20]/95 p-4 shadow-[0_0_50px_rgba(15,23,42,.55)] sm:p-5">
            <div className="mb-5">
              <p className="text-[9px] tracking-[0.28em] text-violet-300">REWARD ARCHIVE</p>
              <h2 className="mt-2 text-base font-black tracking-[0.12em] text-white">
                PAYOUT TABLE
              </h2>
              <p className="mt-2 text-[10px] leading-5 text-slate-500">
                Собери три одинаковых реликвии на центральной линии. Нажми TEST, чтобы принудительно
                проверить любую анимацию выигрыша.
              </p>
            </div>

            <div className="space-y-2">
              {[...SLOT_SYMBOLS].reverse().map((symbol, index) => (
                <div
                  key={symbol.id}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-white/10 bg-white/[0.025] p-2 transition hover:border-violet-400/35 hover:bg-violet-400/5"
                >
                  <SymbolThumbnail symbol={symbol} />
                  <div className="min-w-0">
                    <p className="truncate text-[10px] font-bold text-slate-100">
                      3× {symbol.label}
                    </p>
                    <p className="mt-1 text-[8px] tracking-wider text-slate-500">
                      {index === 0 ? "MYTHIC" : symbol.shortLabel} • {symbol.odds}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-black text-amber-200">+{symbol.payout}</p>
                    <button
                      type="button"
                      disabled={isSpinning || credits < BET}
                      onClick={() => startSpin(symbol.id)}
                      className="mt-1 text-[8px] tracking-wider text-cyan-300 transition hover:text-cyan-100 disabled:opacity-30"
                    >
                      TEST
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 border border-amber-400/15 bg-amber-300/[0.035] p-3">
              <p className="text-[9px] leading-5 text-amber-100/65">
                DEMO RULES: каждый spin стоит {BET} Gold. Шансы и награды являются моковыми и
                сбрасываются после обновления страницы.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
