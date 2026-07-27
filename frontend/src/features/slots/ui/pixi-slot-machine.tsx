"use client";

import { useEffect, useRef } from "react";
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

import {
  SLOT_SYMBOL_ATLAS_URL,
  SLOT_SYMBOL_INDEX,
  SLOT_SYMBOL_VISUAL_BY_ID,
  SLOT_SYMBOL_VISUALS,
  type SlotSpinAnimation,
  type SlotSymbolVisual,
} from "@/features/slots/model";

const CANVAS_WIDTH = 760;
const CANVAS_HEIGHT = 470;
const REEL_TOP = 91;
const REEL_HEIGHT = 285;
const SYMBOL_HEIGHT = 95;
const SYMBOL_SIZE = 82;

interface SlotSceneController {
  spin: (request: SlotSpinAnimation) => void;
}

interface PixiSlotMachineProps {
  request: SlotSpinAnimation | null;
  onSpinFinished: (request: SlotSpinAnimation) => void;
}

function easeInOutCubic(progress: number): number {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

function atlasFrame(symbol: SlotSymbolVisual): Rectangle {
  const xPositions = [12, 424, 836];
  const yPositions = [140, 590];
  return new Rectangle(xPositions[symbol.atlasColumn]!, yPositions[symbol.atlasRow]!, 406, 440);
}

export function PixiSlotMachine({ request, onSpinFinished }: PixiSlotMachineProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<SlotSceneController | null>(null);
  const pendingRequestRef = useRef<SlotSpinAnimation | null>(null);
  const onSpinFinishedRef = useRef(onSpinFinished);

  useEffect(() => {
    onSpinFinishedRef.current = onSpinFinished;
  }, [onSpinFinished]);

  useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const app = new Application();
    let isInitialized = false;
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
      isInitialized = true;

      if (disposed || !host) {
        app.destroy(true);
        return;
      }

      app.canvas.setAttribute("aria-label", "Three-reel fantasy slot machine");
      app.canvas.setAttribute("role", "img");
      app.canvas.className = "block h-auto max-w-full w-full";
      app.canvas.style.width = "100%";
      app.canvas.style.height = "auto";
      host.replaceChildren(app.canvas);

      const atlas = await Assets.load<Texture>(SLOT_SYMBOL_ATLAS_URL);
      if (disposed) {
        return;
      }

      const symbolTextures = Object.fromEntries(
        SLOT_SYMBOL_VISUALS.map((symbol) => [
          symbol.id,
          new Texture({ source: atlas.source, frame: atlasFrame(symbol) }),
        ]),
      ) as Record<(typeof SLOT_SYMBOL_VISUALS)[number]["id"], Texture>;

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
      const reelSprites: Sprite[][] = [];
      const reelXPositions = [82, 288, 494];

      for (let reelIndex = 0; reelIndex < 3; reelIndex += 1) {
        const reelX = reelXPositions[reelIndex]!;
        const reelBackground = new Graphics()
          .roundRect(reelX, REEL_TOP, 184, REEL_HEIGHT, 10)
          .fill({ color: 0x030617, alpha: 1 })
          .stroke({ color: 0x475569, width: 2, alpha: 0.8 });
        app.stage.addChild(reelBackground);

        const reel = new Container();
        const mask = new Graphics().roundRect(reelX, REEL_TOP, 184, REEL_HEIGHT, 10).fill(0xffffff);
        reelLayer.addChild(mask);
        reel.mask = mask;
        reelLayer.addChild(reel);

        const sprites: Sprite[] = [];
        for (let slotIndex = -1; slotIndex <= 3; slotIndex += 1) {
          const sprite = new Sprite(symbolTextures.coin);
          sprite.anchor.set(0.5);
          sprite.position.x = reelX + 92;
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
        const position = reelPositions[reelIndex]!;
        const baseIndex = Math.floor(position);
        const fraction = position - baseIndex;

        reelSprites[reelIndex]!.forEach((sprite, spriteIndex) => {
          const relativeIndex = spriteIndex - 1;
          const symbolIndex =
            (((baseIndex + relativeIndex) % SLOT_SYMBOL_VISUALS.length) +
              SLOT_SYMBOL_VISUALS.length) %
            SLOT_SYMBOL_VISUALS.length;
          sprite.texture = symbolTextures[SLOT_SYMBOL_VISUALS[symbolIndex]!.id];
          sprite.width = SYMBOL_SIZE;
          sprite.height = SYMBOL_SIZE;
          sprite.position.y =
            REEL_TOP + SYMBOL_HEIGHT / 2 + (relativeIndex - fraction) * SYMBOL_HEIGHT;
          sprite.alpha = relativeIndex === 1 ? 1 : 0.58;
        });
      }

      for (let reelIndex = 0; reelIndex < 3; reelIndex += 1) {
        renderReel(reelIndex);
      }

      function playResultEffect(spinRequest: SlotSpinAnimation) {
        const effectStart = performance.now();
        const winIntensity = spinRequest.isWin
          ? Math.min(1, 0.35 + (Math.log2(spinRequest.payout / 10 + 1) / Math.log2(51)) * 0.65)
          : 0;
        const effectDuration = spinRequest.isWin ? 1_800 + winIntensity * 1_400 : 850;
        const centerSprites = reelSprites.map((sprites) => sprites[2]!);
        let winAura: Graphics | null = null;
        const particleData: Array<{
          graphic: Graphics;
          velocityX: number;
          velocityY: number;
          rotationSpeed: number;
        }> = [];

        const banner = new Text({
          text: spinRequest.isWin ? `+${spinRequest.payout} GOLD` : "NO MATCH",
          style: {
            fontFamily: "monospace",
            fontSize: spinRequest.isWin ? 42 + Math.round(winIntensity * 16) : 25,
            fontWeight: "900",
            fill: spinRequest.isWin ? 0xfef08a : 0x94a3b8,
            stroke: { color: 0x020617, width: 7 },
            dropShadow: spinRequest.isWin
              ? {
                  color: 0xf59e0b,
                  blur: 12 + winIntensity * 24,
                  distance: 0,
                  alpha: 1,
                }
              : undefined,
            letterSpacing: 3,
          },
        });
        banner.anchor.set(0.5);
        banner.position.set(CANVAS_WIDTH / 2, 232);
        banner.alpha = 0;
        fxLayer.addChild(banner);

        if (spinRequest.isWin) {
          const winningSymbol = SLOT_SYMBOL_VISUAL_BY_ID[spinRequest.result[0]];
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const particleCount = reducedMotion
            ? 12 + Math.round(winIntensity * 8)
            : 38 + Math.round(winIntensity * 72);

          winAura = new Graphics()
            .circle(0, 0, 115)
            .fill({ color: winningSymbol.accent, alpha: 0.08 + winIntensity * 0.08 })
            .stroke({ color: 0xfde047, width: 3 + winIntensity * 5, alpha: 0.75 });
          winAura.position.set(CANVAS_WIDTH / 2, 232);
          winAura.scale.set(0.45);
          fxLayer.addChildAt(winAura, 0);

          for (let index = 0; index < particleCount; index += 1) {
            const size = 3 + Math.random() * (5 + winIntensity * 5);
            const particle = new Graphics()
              .rect(-size / 2, -size / 2, size, size)
              .fill(index % 3 === 0 ? 0xfde047 : winningSymbol.accent);
            particle.position.set(CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 260, 240);
            fxLayer.addChild(particle);
            particleData.push({
              graphic: particle,
              velocityX: (Math.random() - 0.5) * (8 + winIntensity * 8),
              velocityY: -4 - Math.random() * (7 + winIntensity * 7),
              rotationSpeed: (Math.random() - 0.5) * 0.35,
            });
          }
        }

        const effectTicker = () => {
          const progress = Math.min((performance.now() - effectStart) / effectDuration, 1);
          banner.alpha = Math.min(1, progress * 7) * (progress > 0.78 ? (1 - progress) / 0.22 : 1);
          banner.scale.set(0.65 + Math.min(progress * 3, 1) * 0.35);

          if (spinRequest.isWin) {
            const pulse =
              1 +
              Math.sin(progress * Math.PI * (10 + winIntensity * 6)) *
                (0.06 + winIntensity * 0.1) *
                (1 - progress);
            centerSprites.forEach((sprite) =>
              sprite.scale.set(pulse * (SYMBOL_SIZE / 406), pulse * (SYMBOL_SIZE / 440)),
            );
            paylineGlow.alpha =
              0.65 +
              Math.sin(progress * Math.PI * (12 + winIntensity * 8)) * (0.2 + winIntensity * 0.12);
            app.stage.position.x =
              Math.sin(progress * Math.PI * (18 + winIntensity * 8)) *
              (2 + winIntensity * 6) *
              (1 - progress);

            if (winAura) {
              const auraProgress = Math.sin(progress * Math.PI);
              winAura.scale.set(0.45 + progress * (1.15 + winIntensity * 0.65));
              winAura.alpha = auraProgress * (0.45 + winIntensity * 0.45);
              winAura.rotation = progress * Math.PI * winIntensity;
            }

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
            onSpinFinishedRef.current(spinRequest);
          }
        };

        app.ticker.add(effectTicker);
        cleanupCallbacks.push(() => app.ticker.remove(effectTicker));
      }

      let activeSpin = false;

      function spin(spinRequest: SlotSpinAnimation) {
        if (activeSpin || disposed) {
          return;
        }

        activeSpin = true;
        const startTime = performance.now();
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const durations = reducedMotion ? [450, 550, 650] : [1_850, 2_250, 2_650];
        const starts = [...reelPositions];
        const ends = spinRequest.result.map((symbolId, reelIndex) => {
          const targetRemainder =
            (SLOT_SYMBOL_INDEX[symbolId] - 1 + SLOT_SYMBOL_VISUALS.length) %
            SLOT_SYMBOL_VISUALS.length;
          let candidate = Math.ceil(starts[reelIndex]!) + 18 + reelIndex * 6;
          while (candidate % SLOT_SYMBOL_VISUALS.length !== targetRemainder) {
            candidate += 1;
          }
          return candidate;
        });

        const spinTicker = () => {
          const elapsed = performance.now() - startTime;
          let allFinished = true;

          for (let reelIndex = 0; reelIndex < 3; reelIndex += 1) {
            const progress = Math.min(elapsed / durations[reelIndex]!, 1);
            if (progress < 1) {
              allFinished = false;
            }
            const eased = easeInOutCubic(progress);
            const bounce = Math.sin(progress * Math.PI * 2) * 0.035 * (1 - progress);
            reelPositions[reelIndex] =
              starts[reelIndex]! + (ends[reelIndex]! - starts[reelIndex]!) * eased + bounce;
            renderReel(reelIndex);
          }

          if (allFinished) {
            app.ticker.remove(spinTicker);
            ends.forEach((end, reelIndex) => {
              reelPositions[reelIndex] = end;
              renderReel(reelIndex);
            });
            activeSpin = false;
            playResultEffect(spinRequest);
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
      console.error("Failed to initialize slot machine", error);
      if (!disposed && host) {
        host.replaceChildren();
        const errorMessage = document.createElement("p");
        errorMessage.className =
          "flex h-full items-center justify-center px-6 text-center text-xs leading-6 text-red-300";
        errorMessage.textContent = "The slot machine could not be loaded.";
        host.appendChild(errorMessage);
      }
    });

    return () => {
      disposed = true;
      controllerRef.current = null;
      cleanupCallbacks.forEach((cleanup) => cleanup());
      if (isInitialized) {
        app.destroy(true, { children: true, texture: false, textureSource: false });
      }
    };
  }, []);

  useEffect(() => {
    if (!request) {
      return;
    }

    if (controllerRef.current) {
      controllerRef.current.spin(request);
    } else {
      pendingRequestRef.current = request;
    }
  }, [request]);

  return (
    <div
      ref={hostRef}
      className="aspect-[760/470] w-full max-w-full overflow-hidden rounded-2xl bg-[radial-gradient(circle_at_50%_45%,rgba(109,40,217,.22),transparent_60%)] sm:rounded-[1.25rem]"
    >
      <div className="flex h-full items-center justify-center text-xs tracking-[0.22em] text-violet-200/60">
        LOADING RELICS...
      </div>
    </div>
  );
}
