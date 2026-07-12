import type { BossBattleStatus } from "./boss-battle.types";

const outcomeLabels: Record<Exclude<BossBattleStatus, "DRAFT">, string> = {
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  DEFEATED: "Boss Defeated",
  FINALIZING: "Finalizing Results",
  COMPLETED: "Boss Defeated",
  EXPIRED: "Time Expired",
  CANCELLED: "Cancelled",
};

export function getBossBattleOutcomeLabel(status: BossBattleStatus): string {
  return status === "DRAFT" ? "Unavailable" : outcomeLabels[status];
}

export function isBossBattleActive(status: BossBattleStatus): boolean {
  return status === "ACTIVE";
}

export function isBossBattleFinal(status: BossBattleStatus): boolean {
  return ["DEFEATED", "FINALIZING", "COMPLETED", "EXPIRED", "CANCELLED"].includes(status);
}
