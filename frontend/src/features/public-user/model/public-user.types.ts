export interface PublicUserProfile {
  username: string;
  lastLoginAt: string | null;
  profilePhoto: string | null;
  balance: number;
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
