import type { ItemDisplayRarity, ItemDisplaySlotType } from "@/shared/model/item-display.types";

export type BossBattleStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "DEFEATED"
  | "FINALIZING"
  | "COMPLETED"
  | "EXPIRED"
  | "CANCELLED";

export interface BossAttributes {
  strength: number;
  intelligence: number;
  charisma: number;
  endurance: number;
}

export interface BossRewardItem {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  strength: number | null;
  charisma: number | null;
  agility: number | null;
  intelligence: number | null;
  rarity: ItemDisplayRarity;
  slotType: ItemDisplaySlotType;
  durability: number | null;
}

export interface BossReward extends BossAttributes {
  id: string;
  placeFrom: number;
  placeTo: number;
  goldAmount: number;
  gameScoreAmount: number;
  itemTemplate: BossRewardItem | null;
}

export interface BossParticipant {
  totalDamage: number;
  attacksCount: number;
  nextAttackAt: string;
  place?: number;
  rewardClaimStatus?: "AVAILABLE" | "PROCESSING" | "CLAIMED" | "NOT_ELIGIBLE";
}

export interface BossBattle extends BossAttributes {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string;
  initialHp: number;
  currentHp: number;
  status: BossBattleStatus;
  rewardsEnabled: boolean;
  resultsFinalizedAt: string | null;
  finishedAt: string | null;
  defeatedAt?: string | null;
  createdAt: string;
  rewards: BossReward[];
  serverTime: string;
  participant: BossParticipant | null;
  canAttack: boolean;
  nextAttackAt: string | null;
  damageRange: { min: number; max: number } | null;
}

export interface BossBattleHistoryItem {
  id: string;
  name: string;
  imageUrl: string | null;
  status: BossBattleStatus;
  initialHp: number;
  currentHp: number;
  startsAt: string;
  endsAt: string;
  defeatedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  winner: {
    id: string;
    username: string;
    avatarUrl: string | null;
  } | null;
}

export interface BossBattleHistory {
  items: BossBattleHistoryItem[];
  page: number;
  limit: number;
  total: number;
  serverTime: string;
}

export interface BossClaimRewardResult {
  place: number;
  gold: number;
  gameScore: number;
  attributes: BossAttributes;
  item: BossRewardItem | null;
}

export interface BossLeaderboardEntry {
  place: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalDamage: number;
  attacksCount: number;
}

export interface BossLeaderboard {
  items: BossLeaderboardEntry[];
  own: BossLeaderboardEntry | null;
  page: number;
  limit: number;
  total: number;
}

export interface BossAttackResult {
  appliedDamage: number;
  currentHp: number;
  initialHp: number;
  myTotalDamage: number;
  attacksCount: number;
  nextAttackAt: string;
  bossDefeated: boolean;
}
