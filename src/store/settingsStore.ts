import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  pollIntervalMs: number;
  retentionDays: number;
  showDevTools: boolean;
  hasAcceptedDisclaimer: boolean;

  setPollInterval: (ms: number) => void;
  setRetentionDays: (days: number) => void;
  toggleDevTools: () => void;
  acceptDisclaimer: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      pollIntervalMs: 2000,
      retentionDays: 30,
      showDevTools: false,
      hasAcceptedDisclaimer: false,
      setPollInterval: (pollIntervalMs) => set({ pollIntervalMs }),
      setRetentionDays: (retentionDays) => set({ retentionDays }),
      toggleDevTools: () => set((s) => ({ showDevTools: !s.showDevTools })),
      acceptDisclaimer: () => set({ hasAcceptedDisclaimer: true }),
    }),
    {
      name: 'shadow-scan-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
