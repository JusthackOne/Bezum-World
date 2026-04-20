export type ItemDisplayRarity =
  | "unterlyanskiy"
  | "basic_minimum"
  | "sigma"
  | "bezumnyy"
  | (string & {});

export interface ItemDisplay {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  strength: number | null;
  charisma: number | null;
  endurance?: number | null;
  agility?: number | null;
  intelligence: number | null;
  price: number;
  rarity: ItemDisplayRarity;
  durability: number | null;
}
