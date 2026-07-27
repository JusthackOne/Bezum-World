export interface BattleEquipmentItem {
  id: string;
  name: string;
  slot_type: "HELMET" | "ARMOR" | "PANTS" | "BOOTS" | "LEFT_HAND" | "RIGHT_HAND" | "ACCESSORY";
  description: string | null;
  image_url: string | null;
  strength: number | null;
  charisma: number | null;
  agility: number | null;
  intelligence: number | null;
  price: number;
  rarity: "unterlyanskiy" | "basic_minimum" | "sigma" | "bezumnyy" | (string & {});
  durability: number | null;
  created_at: string;
}

export interface BattlePlayerEquipment {
  helmet?: BattleEquipmentItem;
  chest?: BattleEquipmentItem;
  pants?: BattleEquipmentItem;
  boots?: BattleEquipmentItem;
  leftWeapon?: BattleEquipmentItem;
  rightWeapon?: BattleEquipmentItem;
  accessories: BattleEquipmentItem[];
}

export interface BattlePlayerStats {
  strength: number;
  intelligence: number;
  charisma: number;
  endurance: number;
}

export interface BattlePlayer {
  userId: string;
  username: string;
  avatar: string | null;
  equipment: BattlePlayerEquipment;
  stats: BattlePlayerStats;
  winChancePercent: number;
  winGameScoreReward: number;
  winGoldReward: number;
  isBattleAvailableToday: boolean;
}

export interface BattlePlayersResponse {
  players: BattlePlayer[];
}

export interface StartBattleResponse {
  result: "win" | "lose";
  transferredCoins: number;
  gameScoreReward?: number;
  updatedCurrentUserBalance: number;
  updatedCurrentUserGameScore: number;
  battleAvailableTomorrow: boolean;
}
