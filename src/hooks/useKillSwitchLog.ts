import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface KillSwitchEntry {
  ts: number;
  action: string;
  target_type: string;
  target_name: string;
  success: boolean;
}

export function useKillSwitchLog(initialLimit = 20) {
  const [log, setLog] = useState<KillSwitchEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (limit = initialLimit) => {
    setLoading(true);
    try {
      const entries = await invoke<KillSwitchEntry[]>('get_kill_switch_log', { limit });
      setLog(entries);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [initialLimit]);

  const restoreAll = async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('restore_all_kills');
      await fetch(initialLimit);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(initialLimit);
  }, [fetch, initialLimit]);

  return { log, loading, error, fetch, restoreAll };
}
