import { create } from 'zustand';

export type SortBy = 'risk' | 'date' | 'name';
export type RiskFilter = 'all' | 'high' | 'medium' | 'low';

interface ViewState {
  sortBy: SortBy;
  riskFilter: RiskFilter;
  categoryFilter: string; // 'all' or a specific category name
  setSortBy: (s: SortBy) => void;
  setRiskFilter: (r: RiskFilter) => void;
  setCategoryFilter: (c: string) => void;
}

export const useViewStore = create<ViewState>((set) => ({
  sortBy: 'risk',
  riskFilter: 'all',
  categoryFilter: 'all',
  setSortBy: (sortBy) => set({ sortBy }),
  setRiskFilter: (riskFilter) => set({ riskFilter }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
}));
