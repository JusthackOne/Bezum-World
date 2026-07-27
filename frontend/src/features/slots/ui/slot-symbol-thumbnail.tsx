import {
  SLOT_SYMBOL_ATLAS_URL,
  SLOT_SYMBOL_VISUAL_BY_ID,
  type SlotSymbolId,
} from "@/features/slots/model";

interface SlotSymbolThumbnailProps {
  symbolId: SlotSymbolId;
  compact?: boolean;
}

export function SlotSymbolThumbnail({ symbolId, compact = false }: SlotSymbolThumbnailProps) {
  const symbol = SLOT_SYMBOL_VISUAL_BY_ID[symbolId];
  const backgroundPositionX = ["0%", "50%", "100%"] as const;
  const backgroundPositionY = ["14%", "79%"] as const;

  return (
    <span
      aria-hidden="true"
      className={`${compact ? "size-9" : "size-11"} block shrink-0 rounded-lg border border-white/10 bg-[#05081d] bg-no-repeat shadow-[inset_0_0_12px_rgba(129,92,246,.2)]`}
      style={{
        backgroundImage: `url(${SLOT_SYMBOL_ATLAS_URL})`,
        backgroundPosition: `${backgroundPositionX[symbol.atlasColumn]} ${backgroundPositionY[symbol.atlasRow]}`,
        backgroundSize: "300% 285%",
      }}
    />
  );
}
