import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { type Connection, useConnectionStore } from '../store/connectionStore';
import { useCorrelationStore } from '../store/correlationStore';
import { useSettingsStore } from '../store/settingsStore';

export function useConnectionMonitor() {
  const update = useConnectionStore((s) => s.update);
  const pollMs = useSettingsStore((s) => s.pollIntervalMs);

  useEffect(() => {
    invoke('start_connection_monitor', { intervalMs: pollMs }).catch((e) =>
      console.error('Monitor start failed:', e),
    );

    const unlistenPromise = listen<Connection[]>('connections-update', (event) => {
      // Update connection store (which also calls correlationStore.updateConnections
      // internally after building the final Map of active/stale entries).
      update(event.payload);

      // Belt-and-suspenders: also push raw payload directly so correlation
      // reflects the very latest poll even before stale logic runs.
      useCorrelationStore
        .getState()
        .updateConnections(
          event.payload.map((c) => ({ ...c, lastUpdated: Date.now(), stale: false })),
        );
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [pollMs, update]);
}
