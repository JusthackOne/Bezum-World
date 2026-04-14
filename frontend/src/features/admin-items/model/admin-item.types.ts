export interface AdminItem {
  id: string;
  owner_user_id: string | null;
  name: string;
  description: string | null;
  image_url: string | null;
  strength: number | null;
  charisma: number | null;
  agility: number | null;
  intelligence: number | null;
  price: number;
  rarity: AdminItemRarity;
  slotType: AdminItemSlotType;
  durability: number | null;
  created_at: string;
}

export type AdminItemLocationFilter = "shop" | "inventory" | "all";

export type AdminItemRarity = "unterlyanskiy" | "basic_minimum" | "sigma" | "bezumnyy";
export type AdminItemSlotType = "HELMET" | "ARMOR" | "PANTS" | "BOOTS" | "LEFT_HAND" | "RIGHT_HAND";

export interface GetAdminItemsInput {
  location?: Exclude<AdminItemLocationFilter, "all">;
}

export interface AdminCreateItemInput {
  name: string;
  description: string;
  price: number;
  rarity: AdminItemRarity;
  slotType: AdminItemSlotType;
  imageFile?: File | null;
  strength?: number;
  charisma?: number;
  agility?: number;
  intelligence?: number;
  durability?: number;
}
