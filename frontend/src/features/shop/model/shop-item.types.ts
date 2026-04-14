import type { ItemDisplayRarity } from "@/shared/model/item-display.types";

export interface ShopItem {
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
  rarity: ItemDisplayRarity;
  durability: number | null;
  created_at: string;
}

export interface PurchaseShopItemResponse {
  item: ShopItem;
  balance: number;
}
