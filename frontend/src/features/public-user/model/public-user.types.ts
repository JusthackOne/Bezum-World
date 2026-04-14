export interface PublicUserProfile {
  id: string;
  username: string;
  lastLoginAt: string | null;
  profilePhoto: string | null;
  balance: number;
  gameScore: number;
  attributes: {
    strength: number;
    charisma: number;
    endurance: number;
    intelligence: number;
  };
}

export type PublicItemRarity = "unterlyanskiy" | "basic_minimum" | "sigma" | "bezumnyy";

export interface PublicUserItem {
  id: string;
  name: string;
  type: PublicUserItemType;
  slot_type: PublicEquipmentSlotType;
  description: string | null;
  image_url: string | null;
  strength: number | null;
  charisma: number | null;
  endurance: number | null;
  agility: number | null;
  intelligence: number | null;
  price: number;
  rarity: PublicItemRarity | (string & {});
  durability: number | null;
  created_at: string;
}

export interface PublicUserItemsResponse {
  username: string;
  items: PublicUserItem[];
}

export type PublicUserItemType = "helmet" | "chest" | "pants" | "boots" | "weapon";

export type PublicEquipmentSlotType =
  | "HELMET"
  | "ARMOR"
  | "PANTS"
  | "BOOTS"
  | "LEFT_HAND"
  | "RIGHT_HAND";

export interface PublicUserEquipment {
  helmet?: PublicUserItem;
  chest?: PublicUserItem;
  pants?: PublicUserItem;
  boots?: PublicUserItem;
  leftWeapon?: PublicUserItem;
  rightWeapon?: PublicUserItem;
}

export interface EquipItemResponse {
  equipped: PublicUserEquipment;
}
