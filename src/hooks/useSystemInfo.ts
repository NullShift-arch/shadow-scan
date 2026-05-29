import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface SystemInfo {
  os_name: string;
  os_version: string;
  host_name: string;
  cpu_count: number;
  total_memory_gb: number;
  uptime_seconds: number;
}

export function useSystemInfo() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<SystemInfo>('get_system_info')
      .then(setInfo)
      .catch((e) => setError(String(e)));
  }, []);

  return { info, error };
}
