import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { type Connection, useConnectionStore } from '../store/connectionStore';
import { useSettingsStore } from '../store/settingsStore';

export function useConnectionMonitor() {
  const update = useConnectionStore((s) => s.update);
  const pollMs = useSettingsStore((s) => s.pollIntervalMs);

  useEffect(() => {
    // Start (or restart) the background Rust monitor with the current interval.
    invoke('start_connection_monitor', { intervalMs: pollMs }).catch((e) =>
      console.error('Monitor start failed:', e),
    );

    // Forward each "connections-update" event into the Zustand store.
    const unlistenPromise = listen<Connection[]>('connections-update', (event) => {
      update(event.payload);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [pollMs, update]);
}
