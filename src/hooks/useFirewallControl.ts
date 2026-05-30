import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export function useFirewallControl(ip: string) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check current block state on mount (or when IP changes).
  useEffect(() => {
    invoke<boolean>('is_ip_blocked_cmd', { ip })
      .then(setIsBlocked)
      .catch(() => {}); // Silently ignore — state stays false
  }, [ip]);

  const block = async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('block_ip_cmd', { ip });
      setIsBlocked(true);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unblock = async () => {
    setLoading(true);
    setError(null);
    try {
      await invoke('unblock_ip_cmd', { ip });
      setIsBlocked(false);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { isBlocked, block, unblock, loading, error };
}
