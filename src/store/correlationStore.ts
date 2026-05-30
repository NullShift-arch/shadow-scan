import { create } from 'zustand';
import { type StoredConnection } from './connectionStore';

interface CorrelationState {
  correlations: Map<number, StoredConnection[]>;
  updateConnections: (connections: StoredConnection[]) => void;
  getConnectionsForService: (pid: number) => StoredConnection[];
  getConnectionCountForService: (pid: number) => number;
}

export const useCorrelationStore = create<CorrelationState>((set, get) => ({
  correlations: new Map(),

  updateConnections: (connections) =>
    set(() => {
      const next = new Map<number, StoredConnection[]>();
      for (const conn of connections) {
        if (!conn.stale) {
          const bucket = next.get(conn.pid) ?? [];
          bucket.push(conn);
          next.set(conn.pid, bucket);
        }
      }
      return { correlations: next };
    }),

  getConnectionsForService: (pid) => get().correlations.get(pid) ?? [],

  getConnectionCountForService: (pid) =>
    (get().correlations.get(pid) ?? []).length,
}));
