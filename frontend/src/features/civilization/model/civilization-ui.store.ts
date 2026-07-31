"use client";

import { create } from "zustand";

interface CivilizationUiState {
  selectedTileId: string | null;
  selectedPlayerId: string | null;
  selectedTowerId: string | null;
  setSelectedTile: (tileId: string | null) => void;
  setSelectedPlayer: (playerId: string | null) => void;
  setSelectedTower: (towerId: string | null) => void;
  clearSelection: () => void;
}

export const useCivilizationUiStore = create<CivilizationUiState>((set) => ({
  selectedTileId: null,
  selectedPlayerId: null,
  selectedTowerId: null,
  setSelectedTile: (selectedTileId) =>
    set({ selectedTileId, selectedPlayerId: null, selectedTowerId: null }),
  setSelectedPlayer: (selectedPlayerId) => set({ selectedPlayerId }),
  setSelectedTower: (selectedTowerId) => set({ selectedTowerId }),
  clearSelection: () =>
    set({ selectedTileId: null, selectedPlayerId: null, selectedTowerId: null }),
}));
