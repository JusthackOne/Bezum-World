import { create } from "zustand";

interface AuthUiState {
  isLoginPanelOpen: boolean;
  openLoginPanel: () => void;
  closeLoginPanel: () => void;
  toggleLoginPanel: () => void;
}

export const useAuthUiStore = create<AuthUiState>((set) => ({
  isLoginPanelOpen: false,
  openLoginPanel: () => set({ isLoginPanelOpen: true }),
  closeLoginPanel: () => set({ isLoginPanelOpen: false }),
  toggleLoginPanel: () =>
    set((state) => ({
      isLoginPanelOpen: !state.isLoginPanelOpen,
    })),
}));
