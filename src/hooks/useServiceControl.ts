import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

type ServiceAction = (serviceName: string) => Promise<boolean>;

interface ServiceControl {
  stop: ServiceAction;
  start: ServiceAction;
  disable: ServiceAction;
  enable: ServiceAction;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useServiceControl(): ServiceControl {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const makeAction =
    (command: string): ServiceAction =>
    async (serviceName: string) => {
      setLoading(true);
      setError(null);
      try {
        await invoke(command, { serviceName });
        return true;
      } catch (e) {
        setError(String(e));
        return false;
      } finally {
        setLoading(false);
      }
    };

  return {
    stop:    makeAction('stop_service_cmd'),
    start:   makeAction('start_service_cmd'),
    disable: makeAction('disable_service_cmd'),
    enable:  makeAction('enable_service_cmd'),
    loading,
    error,
    clearError,
  };
}
