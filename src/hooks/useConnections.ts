import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

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

export function useConnections() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const conns = await invoke<Connection[]>('get_connections');
        setConnections(conns);
        setError(null);
      } catch (e) {
        setError(String(e));
        setConnections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchConnections();
  }, []);

  return { connections, error, loading };
}
