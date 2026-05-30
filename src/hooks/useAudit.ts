import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface Finding {
  category: string;
  severity: string;
  title: string;
  description: string;
  impact_points: number;
}

export interface AuditResult {
  score: number;
  risk_level: string;
  findings: Finding[];
  timestamp_ms: number;
}

export function useAudit() {
  const [audit, setAudit] = useState<AuditResult | null>(null);
  const [history, setHistory] = useState<AuditResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (limit = 10) => {
    try {
      const results = await invoke<AuditResult[]>('get_audit_history', { limit });
      setHistory(results);
    } catch {
      // History is supplementary — fail silently
    }
  }, []);

  const run = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await invoke<AuditResult>('run_audit_cmd');
      setAudit(result);
      await fetchHistory();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [fetchHistory]);

  // Initial run + auto-refresh every 60 seconds.
  useEffect(() => {
    run();
    const interval = setInterval(run, 60_000);
    return () => clearInterval(interval);
  }, [run]);

  return { audit, history, run, loading, error };
}
