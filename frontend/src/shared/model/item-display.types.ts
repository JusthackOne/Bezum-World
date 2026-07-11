export type ItemDisplayRarity =
  | "unterlyanskiy"
  | "basic_minimum"
  | "sigma"
  | "bezumnyy"
  | (string & {});

export type ItemDisplaySlotType =
  | "HELMET"
  | "ARMOR"
  | "PANTS"
  | "BOOTS"
  | "LEFT_HAND"
  | "RIGHT_HAND"
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
  slotType?: ItemDisplaySlotType;
  slot_type?: ItemDisplaySlotType;
  durability: number | null;
  created_at?: string;
}
