import { create } from 'zustand';

type Screen = 'network' | 'apple-relay' | 'audit' | 'settings';

interface UIState {
  currentScreen: Screen;
  setScreen: (s: Screen) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentScreen: 'network',
  setScreen: (currentScreen) => set({ currentScreen }),
}));
