import type { SlotSymbolId } from "./slots.types";

export const SLOT_SYMBOL_ATLAS_URL = "/assets/slot-machine/rpg-symbols.png";

export interface SlotSymbolVisual {
  id: SlotSymbolId;
  accent: number;
  atlasColumn: number;
  atlasRow: number;
}

export const SLOT_SYMBOL_VISUALS: readonly SlotSymbolVisual[] = [
  { id: "coin", accent: 0xfacc15, atlasColumn: 0, atlasRow: 0 },
  { id: "potion", accent: 0xfb4f67, atlasColumn: 0, atlasRow: 1 },
  { id: "sword", accent: 0x67e8f9, atlasColumn: 2, atlasRow: 0 },
  { id: "crystal", accent: 0x38bdf8, atlasColumn: 1, atlasRow: 0 },
  { id: "crown", accent: 0xf59e0b, atlasColumn: 1, atlasRow: 1 },
  { id: "dragonEye", accent: 0xd946ef, atlasColumn: 2, atlasRow: 1 },
];

export const SLOT_SYMBOL_VISUAL_BY_ID = Object.fromEntries(
  SLOT_SYMBOL_VISUALS.map((symbol) => [symbol.id, symbol]),
) as Record<SlotSymbolId, SlotSymbolVisual>;

export const SLOT_SYMBOL_INDEX = Object.fromEntries(
  SLOT_SYMBOL_VISUALS.map((symbol, index) => [symbol.id, index]),
) as Record<SlotSymbolId, number>;
