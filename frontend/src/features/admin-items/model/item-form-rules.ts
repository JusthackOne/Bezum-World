import { z } from "zod";

export const ITEM_PRICE_MAX = 1000;

export const itemPriceSchema = z.coerce
  .number()
  .int()
  .min(0, "Price must be at least 0")
  .max(ITEM_PRICE_MAX, `Price must be at most ${ITEM_PRICE_MAX}`);

export const itemAttributeValueSchema = (label: string) =>
  z.coerce.number().int().min(0, `${label} must be at least 0`);

export const itemDurabilitySchema = z.coerce
  .number()
  .int()
  .min(0, "Durability must be at least 0")
  .max(100, "Durability must be at most 100");
