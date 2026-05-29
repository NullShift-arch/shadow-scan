import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useConnectionStore } from '../store/connectionStore';

const BATCH_SIZE = 5;
const INTERVAL_MS = 5_000;

export function useDnsEnrichment() {
  useEffect(() => {
    const resolveNext = async () => {
      // Read store state imperatively so the interval isn't restarted on
      // every connections update (which happens every 2 seconds).
      const { connections } = useConnectionStore.getState();

      const unresolved = Array.from(connections.values())
        .filter((c) => !c.remote_hostname && !c.stale)
        .slice(0, BATCH_SIZE);

      for (const conn of unresolved) {
        try {
          const hostname = await invoke<string | null>('resolve_hostname', {
            ip: conn.remote_addr,
          });

          if (hostname) {
            useConnectionStore.setState((state) => {
              const next = new Map(state.connections);
              const key = `${conn.pid}-${conn.local_port}-${conn.remote_addr}-${conn.remote_port}`;
              const existing = next.get(key);
              if (existing) {
                next.set(key, { ...existing, remote_hostname: hostname });
              }
              return { connections: next };
            });
          }
        } catch {
          // DNS failures are silent — the hostname stays blank.
        }
      }
    };

    const timer = setInterval(resolveNext, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []); // empty deps — reads store via getState(), not reactive subscription
}
