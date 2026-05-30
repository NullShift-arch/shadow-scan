import { create } from 'zustand';
import { useCorrelationStore } from './correlationStore';

export interface Connection {
  pid: number;
  process_name: string;
  process_path?: string;
  local_addr: string;
  local_port: number;
  remote_addr: string;
  remote_port: number;
  state: string;
  protocol: string;
  first_seen_ms: number;
  last_seen_ms: number;
  remote_hostname?: string;
  category?: string;
  risk_level?: string;
  plain_language?: string;
}

export interface StoredConnection extends Connection {
  lastUpdated: number;
  stale: boolean;
}

interface ConnectionState {
  connections: Map<string, StoredConnection>;
  update: (incoming: Connection[]) => void;
  getList: () => StoredConnection[];
  count: () => number;
}

function keyOf(c: Connection): string {
  return `${c.pid}-${c.local_port}-${c.remote_addr}-${c.remote_port}`;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: new Map(),

  update: (incoming) =>
    set((state) => {
      const now = Date.now();
      const next = new Map(state.connections);

      // Mark connections not in the latest snapshot as stale (5s timeout).
      for (const [k, v] of next) {
        if (now - v.lastUpdated > 5000) {
          next.set(k, { ...v, stale: true });
        }
      }

      // Add or refresh incoming connections.
      for (const c of incoming) {
        const k = keyOf(c);
        const existing = next.get(k);
        next.set(k, {
          ...c,
          first_seen_ms: existing?.first_seen_ms ?? c.first_seen_ms,
          last_seen_ms: now,
          lastUpdated: now,
          stale: false,
        });
      }

      // Drop connections that have been stale for more than 30 seconds.
      for (const [k, v] of next) {
        if (now - v.lastUpdated > 30_000) {
          next.delete(k);
        }
      }

      // Push active connections into correlation store for service-PID mapping.
      useCorrelationStore.getState().updateConnections(Array.from(next.values()));

      return { connections: next };
    }),

  getList: () =>
    Array.from(get().connections.values()).sort(
      (a, b) => b.last_seen_ms - a.last_seen_ms,
    ),

  count: () => get().connections.size,
}));
