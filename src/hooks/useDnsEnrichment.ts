import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useConnectionStore } from '../store/connectionStore';

const BATCH_SIZE = 5;
const INTERVAL_MS = 5_000;

export function useDnsEnrichment() {
  useEffect(() => {
    const resolveNext = async () => {
      // Read store state imperatively — avoids stale closure and prevents the
      // interval from resetting every 2 s when the connections Map reference changes.
      const { connections } = useConnectionStore.getState();

      const unresolved = Array.from(connections.values())
        .filter((c) => !c.remote_hostname && !c.stale)
        .slice(0, BATCH_SIZE);

      for (const conn of unresolved) {
        try {
          const hostname = await invoke<string | null>('resolve_hostname', {
            ip: conn.remote_addr,
          });

          if (!hostname) continue;

          // Second-pass classification: domain patterns now available.
          const classified = await invoke<[string, string, string] | null>(
            're_classify_connection',
            { hostname, remoteIp: conn.remote_addr },
          );

          useConnectionStore.setState((state) => {
            const next = new Map(state.connections);
            const key = `${conn.pid}-${conn.local_port}-${conn.remote_addr}-${conn.remote_port}`;
            const existing = next.get(key);
            if (!existing) return state;

            const update = { ...existing, remote_hostname: hostname };
            if (classified) {
              const [category, riskLevel, plainLanguage] = classified;
              update.category = category;
              update.risk_level = riskLevel;
              update.plain_language = plainLanguage;
            }
            next.set(key, update);
            return { connections: next };
          });
        } catch {
          // DNS / classification failures are silent — fields stay as-is.
        }
      }
    };

    const timer = setInterval(resolveNext, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []); // empty deps — store read via getState(), not reactive subscription
}
