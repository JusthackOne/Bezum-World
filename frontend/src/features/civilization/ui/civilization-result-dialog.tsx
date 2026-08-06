"use client";

import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CoinsIcon,
  CrownIcon,
  GiftIcon,
  HandshakeIcon,
} from "lucide-react";

import {
  CIVILIZATION_ATTRIBUTE_KEYS,
  type CivilizationGameState,
  type CivilizationTeamSummary,
} from "@/entities/civilization";
import { formatDateTime } from "@/shared/lib/date-time";
import { formatNumber } from "@/shared/lib/number-format";
import { cn } from "@/shared/lib/utils";
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
import { attributeVisuals, GameScoreIcon, RewardBadgesList } from "@/shared/ui";

interface CivilizationResultDialogProps {
  state: CivilizationGameState;
  open: boolean;
  isClaimPending: boolean;
  claimErrorMessage: string | null;
  onOpenChange: (open: boolean) => void;
  onClaimReward: () => void;
}

function completionReasonLabel(reason: string | null): string {
  if (reason === "TOWN_HALL_CAPTURED") {
    return "Enemy Town Hall destroyed";
  }
  if (!reason) {
    return "Event completed";
  }
  return reason.replaceAll("_", " ").toLowerCase();
}

function TeamResultCard({
  team,
  isWinner,
}: {
  team: CivilizationTeamSummary;
  isWinner: boolean;
}) {
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card/80 p-3",
        isWinner && "shadow-[0_0_24px_rgba(250,204,21,0.12)]",
      )}
      style={{ borderColor: isWinner ? team.color : undefined }}
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: team.color }} />
      <header className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{team.name}</p>
          <p className="mt-1 text-[9px] text-muted-foreground">
            {team.playerCount} {team.playerCount === 1 ? "player" : "players"}
          </p>
        </div>
        {isWinner ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/50 bg-amber-500/10 px-2 py-1 text-[9px] font-semibold text-amber-200">
            <CrownIcon className="size-3" /> Winner
          </span>
        ) : null}
      </header>

      <div className="my-3 flex items-center justify-between rounded-md border bg-violet-500/10 px-3 py-2">
        <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <GameScoreIcon className="size-4 text-fuchsia-300" /> Final score
        </span>
        <strong className="text-lg text-fuchsia-200 tabular-nums">
          {formatNumber(team.finalScore ?? "0")}
        </strong>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex items-center justify-between rounded-md border border-amber-400/40 bg-amber-500/10 px-3 py-2">
          <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <CoinsIcon className="size-4 text-amber-300" /> Gold
          </span>
          <strong className="text-sm text-amber-200 tabular-nums">
            {formatNumber(team.finalGold ?? "0")}
          </strong>
        </div>
        {CIVILIZATION_ATTRIBUTE_KEYS.map((key) => {
          const visual = attributeVisuals[key];
          const Icon = visual.icon;
          return (
            <div
              key={key}
              className={cn(
                "flex items-center justify-between gap-2 rounded-md border px-2 py-2",
                visual.accentClassName,
              )}
              aria-label={`${visual.label}: ${formatNumber(team.finalAttributes?.[key] ?? "0")}`}
              title={visual.label}
            >
              <Icon className={cn("size-4 shrink-0", visual.iconClassName)} />
              <span className="text-xs font-semibold text-foreground tabular-nums">
                {formatNumber(team.finalAttributes?.[key] ?? "0")}
              </span>
            </div>
          );
        })}
      </div>
    </article>
  );
}

export function CivilizationResultDialog({
  state,
  open,
  isClaimPending,
  claimErrorMessage,
  onOpenChange,
  onClaimReward,
}: CivilizationResultDialogProps) {
  const winner = state.game.winnerTeam;
  const rewardClaim = state.rewardClaim;
  const rewardBadges = rewardClaim
    ? [
        { kind: "balance" as const, value: rewardClaim.reward.gold },
        ...CIVILIZATION_ATTRIBUTE_KEYS.map((key) => ({
          kind: key,
          value: rewardClaim.reward.attributes[key],
        })),
      ]
    : [];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[calc(100vh-2rem)] max-w-3xl gap-0 overflow-y-auto p-0">
        <AlertDialogHeader className="relative overflow-hidden border-b bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_58%)] px-5 py-6 text-center sm:px-6">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full border border-amber-300/40 bg-amber-400/10 shadow-[0_0_30px_rgba(250,204,21,0.16)]">
            {winner ? (
              <CrownIcon className="size-7 text-amber-300" />
            ) : (
              <HandshakeIcon className="size-7 text-sky-300" />
            )}
          </div>
          <AlertDialogTitle className="text-xl">
            {winner ? `${winner.name} wins!` : "The battle ends in a draw"}
          </AlertDialogTitle>
          <p className="text-[10px] text-muted-foreground">
            {completionReasonLabel(state.game.completionReason)}
          </p>
        </AlertDialogHeader>

        <AlertDialogDescription asChild>
          <div className="space-y-4 p-4 text-left text-foreground sm:p-6">
            <section aria-labelledby="final-standings-title">
              <div className="mb-3 flex items-center gap-2">
                <GameScoreIcon className="size-4 text-fuchsia-300" />
                <h3 id="final-standings-title" className="text-xs font-semibold">
                  Final standings
                </h3>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {state.game.teams.map((team) => (
                  <TeamResultCard
                    key={team.id}
                    team={team}
                    isWinner={team.id === state.game.winnerTeamId}
                  />
                ))}
              </div>
            </section>

            <section
              className="rounded-lg border bg-muted/20 p-4"
              aria-labelledby="personal-reward-title"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <GiftIcon className="size-4 text-emerald-300" />
                    <h3 id="personal-reward-title" className="text-xs font-semibold">
                      Your reward
                    </h3>
                  </div>
                  {rewardClaim?.eligible ? (
                    <p className="mt-1 flex items-center gap-1 text-[9px] text-muted-foreground">
                      {rewardClaim.claimedAt ? (
                        <>
                          <CheckCircle2Icon className="size-3 text-emerald-300" /> Claimed{" "}
                          {formatDateTime(rewardClaim.claimedAt)}
                        </>
                      ) : (
                        "Ready to claim"
                      )}
                    </p>
                  ) : null}
                </div>
                {rewardClaim?.eligible ? (
                  <RewardBadgesList rewards={rewardBadges} className="sm:justify-end" />
                ) : (
                  <p className="max-w-sm text-[10px] text-muted-foreground">
                    {rewardClaim?.unavailableReason ?? "No reward is available for this account."}
                  </p>
                )}
              </div>
            </section>

            {claimErrorMessage ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive">
                <AlertTriangleIcon className="size-4 shrink-0" /> {claimErrorMessage}
              </div>
            ) : null}
          </div>
        </AlertDialogDescription>

        <AlertDialogFooter className="border-t bg-muted/20 p-4 sm:px-6">
          <AlertDialogCancel disabled={isClaimPending}>Close</AlertDialogCancel>
          {rewardClaim?.eligible && !rewardClaim.claimedAt ? (
            <AlertDialogAction
              disabled={isClaimPending}
              onClick={(event) => {
                event.preventDefault();
                onClaimReward();
              }}
            >
              <GiftIcon className="size-4" />
              {isClaimPending ? "Claiming..." : "Claim reward"}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
