export type SlotSymbolId = "coin" | "potion" | "sword" | "crystal" | "crown" | "dragonEye";

export interface SlotSymbol {
  id: SlotSymbolId;
  label: string;
  shortLabel: string;
  payoutMultiplier: number;
  payout: number;
  chanceBps: number;
}

export interface SlotsConfig {
  bet: number;
  rtpBps: number;
  hitRateBps: number;
  symbols: SlotSymbol[];
}

export interface SlotSpinResult {
  result: [SlotSymbolId, SlotSymbolId, SlotSymbolId];
  bet: number;
  payout: number;
  netChange: number;
  isWin: boolean;
}

export interface SlotSpinAnimation extends SlotSpinResult {
  id: number;
}

export type SlotLeaderboardType = "winnings" | "losses";

export interface SlotLeaderboardEntry {
  userId: string;
  username: string;
  avatar: string | null;
  rank: number;
  totalWinnings: number;
  totalLosses: number;
}

export interface SlotLeaderboardResponse {
  type: SlotLeaderboardType;
  leaders: SlotLeaderboardEntry[];
}
