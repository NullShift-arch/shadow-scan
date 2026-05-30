import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Service {
  name: string;
  display_name: string;
  state: 'running' | 'stopped' | 'paused' | 'continuing' | 'starting' | 'stopping' | 'pausing';
  startup_type: 'Boot' | 'System' | 'Auto' | 'Demand' | 'Disabled';
  pid?: number;
  description?: string;
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const svcs = await invoke<Service[]>('get_services');
        setServices(svcs);
        setError(null);
      } catch (e) {
        setError(String(e));
        setServices([]);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, []);

  return { services, error, loading };
}
