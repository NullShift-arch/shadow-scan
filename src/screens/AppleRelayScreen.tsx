import { useState, useCallback } from 'react';
import { useServices } from '../hooks/useServices';
import { useConnectionStore } from '../store/connectionStore';
import { useCorrelationStore } from '../store/correlationStore';
import { ServiceDetail } from '../components/ServiceDetail';

export function AppleRelayScreen() {
  const { services, loading, error, refetch } = useServices();
  const connectionCount = useConnectionStore((s) => s.count());
  const correlations = useCorrelationStore((s) => s.correlations);
  const [expandedPids, setExpandedPids] = useState<Set<number>>(new Set());

  const toggleExpanded = (pid: number) => {
    setExpandedPids((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  // After a kill-switch action, wait 1 s for state to settle then refetch.
  const handleActionComplete = useCallback(() => {
    setTimeout(() => refetch(), 1000);
  }, [refetch]);

  const runningServices = services.filter((s) => s.state === 'running');

  // Services with active connections sort first, then alphabetically.
  const sorted = [...runningServices].sort((a, b) => {
    const ca = correlations.get(a.pid ?? 0)?.length ?? 0;
    const cb = correlations.get(b.pid ?? 0)?.length ?? 0;
    if (cb !== ca) return cb - ca;
    return a.display_name.localeCompare(b.display_name);
  });

  const withConnections = sorted.filter(
    (s) => (correlations.get(s.pid ?? 0)?.length ?? 0) > 0,
  ).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-medium">Services</h2>
          <p className="text-tf-text/40 text-xs mt-0.5">
            {runningServices.length} running · {withConnections} active · {connectionCount} connections
          </p>
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className="text-[11px] px-2.5 py-1 rounded border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-tf-text/55 transition-colors disabled:opacity-40"
        >
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {error && <div className="text-tf-red text-sm mb-4">Error: {error}</div>}
      {loading && <p className="text-tf-text/50 text-xs animate-pulse">Loading services…</p>}

      {!loading && sorted.length > 0 && (
        <div className="space-y-1">
          {sorted.map((s) => (
            <ServiceDetail
              key={s.name}
              service={s}
              expanded={expandedPids.has(s.pid ?? 0)}
              onToggle={() => toggleExpanded(s.pid ?? 0)}
              onActionComplete={handleActionComplete}
            />
          ))}
        </div>
      )}

      {!loading && runningServices.length === 0 && (
        <p className="text-tf-text/40 text-xs mt-8">No running services found.</p>
      )}

      {/* Debug panel — all services */}
      {!loading && services.length > 0 && (
        <div className="mt-8 pt-5 border-t border-white/8 text-xs text-tf-text/30">
          <details>
            <summary className="cursor-pointer hover:text-tf-text/50 transition-colors">
              All services ({services.length})
            </summary>
            <div className="mt-2 space-y-0.5 font-mono text-[10px] max-h-48 overflow-y-auto">
              {services.map((s) => (
                <div key={s.name} className="flex gap-2">
                  <span className="w-20 truncate shrink-0">{s.state}</span>
                  <span className="truncate">{s.display_name}</span>
                  {s.pid && <span className="text-tf-text/20 shrink-0">PID {s.pid}</span>}
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
