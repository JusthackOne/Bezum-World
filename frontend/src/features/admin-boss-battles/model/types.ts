export type BossBattleStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "DEFEATED"
  | "FINALIZING"
  | "EXPIRED"
  | "CANCELLED"
  | "COMPLETED";
export interface BossAttributes {
  strength: number;
  charisma: number;
  endurance: number;
  intelligence: number;
}
export interface BossRewardItem {
  name: string;
  description?: string;
  imageUrl?: string;
  slotType: "HELMET" | "ARMOR" | "PANTS" | "BOOTS" | "LEFT_HAND" | "RIGHT_HAND";
  rarity: "unterlyanskiy" | "basic_minimum" | "sigma" | "bezumnyy";
  durability?: number;
  price: number;
  strength?: number;
  charisma?: number;
  agility?: number;
  intelligence?: number;
  attributes?: {
    strength?: number;
    charisma?: number;
    agility?: number;
    intelligence?: number;
  };
}
export interface BossReward {
  id?: string;
  placeFrom: number;
  placeTo: number;
  gold?: number;
  goldAmount?: number;
  gameScore?: number;
  gameScoreAmount?: number;
  attributes?: BossAttributes;
  strength?: number;
  charisma?: number;
  endurance?: number;
  intelligence?: number;
  item?: BossRewardItem;
  itemTemplate?: BossRewardItem;
}
export interface BossBattle {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string;
  initialHp: number;
  currentHp: number;
  totalAppliedDamage: number;
  strength: number;
  charisma: number;
  endurance: number;
  intelligence: number;
  attackCooldownSeconds: number;
  status: BossBattleStatus;
  createdAt: string;
  updatedAt: string;
  rewards: BossReward[];
  participants?: unknown[];
}
export interface BossBattleInput {
  name: string;
  description?: string;
  imageUrl?: string;
  startsAt: string;
  endsAt: string;
  initialHp: number;
  attributes: BossAttributes;
  attackCooldownSeconds: number;
  rewards: BossReward[];
  publish?: boolean;
}
