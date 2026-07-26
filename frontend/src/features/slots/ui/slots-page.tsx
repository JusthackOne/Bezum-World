"use client";

import { useCallback, useRef, useState } from "react";
import { CoinsIcon, SparklesIcon } from "lucide-react";

import { useClientAuthStore } from "@/features/auth/model";
import { usePublicUserProfileQuery } from "@/features/public-user/api";
import { useSlotsConfigQuery, useSpinSlotsMutation } from "@/features/slots/api";
import type { SlotSpinAnimation, SlotSpinResult, SlotSymbol } from "@/features/slots/model";

import { PixiSlotMachine } from "./pixi-slot-machine";
import { SlotSymbolThumbnail } from "./slot-symbol-thumbnail";

const MAX_RECENT_SPINS = 5;

interface SlotPaytableProps {
  symbols: SlotSymbol[];
}

function formatBasisPoints(value: number): string {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value / 100)}%`;
}

function SlotPaytable({ symbols }: SlotPaytableProps) {
  return (
    <aside className="rounded-2xl border border-violet-400/20 bg-[#090b20]/95 p-4 shadow-[0_0_50px_rgba(15,23,42,.55)] sm:p-5">
      <div className="mb-5">
        <p className="text-[9px] tracking-[0.28em] text-violet-300">REWARD ARCHIVE</p>
        <h2 className="mt-2 text-base font-black tracking-[0.12em] text-white">PAYOUT TABLE</h2>
        <p className="mt-2 text-[10px] leading-5 text-slate-500">
          Match three identical relics on the highlighted center payline.
        </p>
      </div>

      <div className="space-y-2">
        {[...symbols].reverse().map((symbol, index) => (
          <div
            key={symbol.id}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.025] p-2 transition hover:border-violet-400/35 hover:bg-violet-400/5"
          >
            <SlotSymbolThumbnail symbolId={symbol.id} />
            <div className="min-w-0">
              <p className="truncate text-[10px] font-bold text-slate-100">3× {symbol.label}</p>
              <p className="mt-1 truncate text-[8px] tracking-wider text-slate-500">
                {index === 0 ? "MYTHIC" : symbol.shortLabel} • {formatBasisPoints(symbol.chanceBps)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-black text-amber-200">+{symbol.payout}</p>
              <p className="mt-1 text-[8px] tracking-wider text-amber-100/45">
                ×{symbol.payoutMultiplier}
              </p>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function RecentSpins({ history }: { history: SlotSpinAnimation[] }) {
  return (
    <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[10px] tracking-[0.22em] text-slate-300">RECENT SPINS</h2>
        <span className="text-[9px] text-slate-500">THIS PAGE ONLY</span>
      </div>

      {history.length === 0 ? (
        <p className="py-3 text-center text-[10px] leading-5 text-slate-600">
          Your latest spins will appear here.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-[#090b20] px-3 py-2"
            >
              <div className="flex -space-x-1.5">
                {entry.result.map((symbolId, index) => (
                  <SlotSymbolThumbnail key={`${entry.id}-${index}`} symbolId={symbolId} compact />
                ))}
              </div>
              <span className={`text-[9px] ${entry.isWin ? "text-amber-200" : "text-slate-500"}`}>
                {entry.isWin ? `+${entry.payout}` : "MISS"}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function SlotsPage() {
  const configQuery = useSlotsConfigQuery();
  const spinMutation = useSpinSlotsMutation();
  const sessionUser = useClientAuthStore((state) => state.session?.user);
  const currentUserQuery = usePublicUserProfileQuery(sessionUser?.username ?? "");
  const balance = currentUserQuery.data?.balance ?? sessionUser?.balance ?? 0;
  const [isAnimating, setIsAnimating] = useState(false);
  const [spinRequest, setSpinRequest] = useState<SlotSpinAnimation | null>(null);
  const [history, setHistory] = useState<SlotSpinAnimation[]>([]);
  const [lastResult, setLastResult] = useState<SlotSpinResult | null>(null);
  const requestIdRef = useRef(0);

  const isSpinning = spinMutation.isPending || isAnimating;
  const bet = configQuery.data?.bet ?? 5;

  const handleSpin = useCallback(() => {
    if (isSpinning || !configQuery.data || balance < configQuery.data.bet) {
      return;
    }

    setLastResult(null);
    setIsAnimating(true);
    spinMutation.mutate(undefined, {
      onSuccess: (result) => {
        requestIdRef.current += 1;
        setSpinRequest({ id: requestIdRef.current, ...result });
      },
      onError: () => {
        setIsAnimating(false);
      },
    });
  }, [balance, configQuery.data, isSpinning, spinMutation]);

  const handleSpinFinished = useCallback((completedSpin: SlotSpinAnimation) => {
    setLastResult(completedSpin);
    setHistory((current) => [completedSpin, ...current].slice(0, MAX_RECENT_SPINS));
    setIsAnimating(false);
  }, []);

  if (configQuery.isPending) {
    return (
      <div className="flex min-h-96 items-center justify-center rounded-2xl border bg-card">
        <p className="text-sm text-muted-foreground">Loading the slot machine...</p>
      </div>
    );
  }

  if (configQuery.isError || !configQuery.data) {
    return (
      <div className="flex min-h-96 flex-col items-center justify-center gap-4 rounded-2xl border bg-card p-6 text-center">
        <p className="text-sm text-destructive">
          {configQuery.error instanceof Error
            ? configQuery.error.message
            : "Unable to load the slot machine."}
        </p>
        <button
          type="button"
          onClick={() => void configQuery.refetch()}
          className="rounded-full border px-5 py-2 text-sm font-semibold transition hover:bg-accent"
        >
          Try again
        </button>
      </div>
    );
  }

  const config = configQuery.data;
  const canAffordSpin = balance >= config.bet;

  return (
    <div className="relative min-w-0 overflow-hidden rounded-3xl bg-[#040511] p-3 text-white shadow-2xl sm:p-5 lg:p-7">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(34,211,238,.13),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(168,85,247,.18),transparent_34%),radial-gradient(circle_at_50%_90%,rgba(245,158,11,.10),transparent_36%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="relative min-w-0">
        <header className="mb-5 flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.3em] text-cyan-300">
              <SparklesIcon className="size-4" /> SLOTS
            </p>
            <h1 className="text-xl leading-relaxed font-black tracking-[0.08em] text-amber-100 sm:text-2xl">
              ARCANE RELIQUARY
            </h1>
            <p className="mt-1 max-w-xl text-xs leading-5 text-slate-400">
              Match three relics on the center line and claim the reward.
            </p>
          </div>
        </header>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0">
            <div className="w-full min-w-0 overflow-hidden rounded-3xl border border-violet-400/25 bg-[#090b20]/90 p-1.5 shadow-[0_0_80px_rgba(109,40,217,.16)] sm:p-3">
              <PixiSlotMachine request={spinRequest} onSpinFinished={handleSpinFinished} />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <div className="flex min-h-20 items-center justify-between rounded-2xl border border-amber-400/25 bg-amber-400/5 px-4 py-3">
                <div>
                  <p className="text-[9px] tracking-[0.22em] text-amber-200/60">YOUR BALANCE</p>
                  <p className="mt-2 flex items-center gap-2 text-lg font-black text-amber-200">
                    <CoinsIcon className="size-5" /> {balance.toLocaleString("en-US")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSpinning || !canAffordSpin}
                onClick={handleSpin}
                className="group relative mx-auto flex size-32 items-center justify-center rounded-full p-1 shadow-[0_0_22px_rgba(245,158,11,.45),0_10px_28px_rgba(0,0,0,.45)] transition duration-300 hover:scale-105 hover:shadow-[0_0_38px_rgba(245,158,11,.7),0_14px_34px_rgba(0,0,0,.5)] active:scale-95 disabled:cursor-not-allowed disabled:grayscale disabled:hover:scale-100"
              >
                <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#fef08a,#f59e0b,#7c3aed,#22d3ee,#fef08a)] transition duration-500 group-hover:rotate-180" />
                <span className="absolute inset-1 rounded-full bg-[#1b102b] shadow-[inset_0_0_24px_rgba(245,158,11,.2)]" />
                <span className="relative z-10 flex size-24 flex-col items-center justify-center rounded-full border border-amber-200/40 bg-[radial-gradient(circle_at_45%_30%,#fbbf24,#b45309_65%,#451a03)] text-[#211006] shadow-[inset_0_3px_8px_rgba(255,255,255,.45),inset_0_-7px_14px_rgba(69,26,3,.5)]">
                  <SparklesIcon className={`mb-1 size-5 ${isSpinning ? "animate-pulse" : ""}`} />
                  <span className="text-sm font-black tracking-[0.16em]">
                    {isSpinning ? "SPIN..." : "SPIN"}
                  </span>
                  <span className="mt-1 text-[9px] font-bold tracking-wider">BET {bet}</span>
                </span>
              </button>

              <div className="flex min-h-20 items-center rounded-2xl border border-cyan-400/20 bg-cyan-400/5 px-4 py-3 sm:text-right">
                <div className="w-full">
                  <p className="text-[9px] tracking-[0.22em] text-cyan-200/60">LAST RESULT</p>
                  <p
                    className={`mt-2 text-sm font-black ${lastResult?.isWin ? "text-amber-200" : "text-slate-400"}`}
                    aria-live="polite"
                  >
                    {isSpinning
                      ? "SPINNING"
                      : lastResult === null
                        ? "READY"
                        : lastResult.isWin
                          ? `WIN +${lastResult.payout} GOLD`
                          : "NO MATCH"}
                  </p>
                </div>
              </div>
            </div>

            {!canAffordSpin ? (
              <p className="mt-3 text-center text-xs text-amber-200/70">
                You need at least {config.bet} Gold to spin.
              </p>
            ) : null}

            {spinMutation.isError ? (
              <p className="mt-3 text-center text-xs text-red-300" role="alert">
                {spinMutation.error instanceof Error
                  ? spinMutation.error.message
                  : "Unable to complete the spin."}
              </p>
            ) : null}

            <RecentSpins history={history} />
          </section>

          <SlotPaytable symbols={config.symbols} />
        </div>
      </div>
    </div>
  );
}
