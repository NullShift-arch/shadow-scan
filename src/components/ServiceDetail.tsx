import { useState } from 'react';
import { type Service } from '../hooks/useServices';
import { useServiceControl } from '../hooks/useServiceControl';
import { useFirewallControl } from '../hooks/useFirewallControl';
import { useCorrelationStore } from '../store/correlationStore';
import { type StoredConnection } from '../store/connectionStore';

interface Props {
  service: Service;
  expanded: boolean;
  onToggle: () => void;
  onActionComplete?: () => void;
}

function stateColor(state: string) {
  switch (state) {
    case 'running':  return 'text-tf-teal';
    case 'stopped':  return 'text-tf-text/50';
    default:         return 'text-tf-amber';
  }
}

function truncate(s: string, max = 52) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// ── Per-connection row with its own block/unblock state ──────────────────────
// Hook must be called at component top level, not inside a .map() callback.
function ConnectionBlockRow({ c }: { c: StoredConnection }) {
  const { isBlocked, block, unblock, loading } = useFirewallControl(c.remote_addr);

  return (
    <div className="text-xs pb-2 mb-2 border-b border-white/5 last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <div className="flex-1 min-w-0">
          {c.remote_hostname && (
            <div className="font-mono text-tf-text/55 text-[11px] truncate">
              {truncate(c.remote_hostname)}
            </div>
          )}
          <div className="font-mono text-tf-text/40">
            {c.remote_addr}:{c.remote_port}
          </div>
        </div>
        <button
          onClick={() => (isBlocked ? unblock() : block())}
          disabled={loading}
          className={`text-[10px] px-2 py-0.5 rounded border whitespace-nowrap transition-colors disabled:opacity-40 flex-shrink-0 ${
            isBlocked
              ? 'bg-tf-amber/15 border-tf-amber/25 text-tf-amber hover:bg-tf-amber/25'
              : 'bg-tf-red/15 border-tf-red/25 text-tf-red hover:bg-tf-red/25'
          }`}
        >
          {loading ? '…' : isBlocked ? 'Unblock' : 'Block'}
        </button>
      </div>
      {c.plain_language && (
        <div className="text-tf-text/40 italic">{truncate(c.plain_language, 64)}</div>
      )}
    </div>
  );
}

// ── Main ServiceDetail card ──────────────────────────────────────────────────
export function ServiceDetail({ service, expanded, onToggle, onActionComplete }: Props) {
  const connections = useCorrelationStore(
    (s) => s.getConnectionsForService(service.pid ?? 0),
  );
  const { stop, start, disable, enable, loading, error, clearError } = useServiceControl();
  const [busy, setBusy] = useState(false);

  const count = connections.length;

  const runAction = async (fn: (name: string) => Promise<boolean>) => {
    setBusy(true);
    clearError();
    const ok = await fn(service.name);
    setBusy(false);
    if (ok) onActionComplete?.();
  };

  return (
    <div className="border border-white/8 rounded overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full text-left p-3 bg-white/[0.03] hover:bg-white/[0.06] transition-colors flex items-center justify-between gap-3"
      >
        <div className="flex-1 min-w-0">
          <div className="font-medium text-xs truncate">{service.display_name}</div>
          <div className="text-[10px] text-tf-text/45 font-mono">{service.name}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {count > 0 && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-tf-teal/15 text-tf-teal">
              {count}
            </span>
          )}
          {service.pid && (
            <span className="text-[10px] text-tf-text/35">PID {service.pid}</span>
          )}
          <span className={`text-[10px] font-semibold ${stateColor(service.state)}`}>
            {service.state.toUpperCase()}
          </span>
          <span className="text-tf-text/30 text-[10px]">{expanded ? '▼' : '▶'}</span>
        </div>
      </button>

      {/* Expanded body */}
      {expanded && (
        <>
          {/* Connections with per-IP block buttons */}
          <div className="border-t border-white/8 bg-black/20 p-3">
            {count === 0 ? (
              <p className="text-xs text-tf-text/35">No active connections</p>
            ) : (
              <div>
                {connections.map((c) => (
                  <ConnectionBlockRow
                    key={`${c.pid}-${c.local_port}-${c.remote_addr}-${c.remote_port}`}
                    c={c}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Service kill-switch buttons */}
          <div className="border-t border-white/8 bg-black/10 p-3 flex gap-2 flex-wrap">
            {service.state === 'running' && (
              <button
                onClick={() => runAction(stop)}
                disabled={busy || loading}
                className="text-[11px] px-2.5 py-1 bg-tf-red/15 border border-tf-red/25 text-tf-red rounded hover:bg-tf-red/25 transition-colors disabled:opacity-40"
              >
                {busy ? 'Stopping…' : 'Stop'}
              </button>
            )}
            {service.state === 'stopped' && (
              <button
                onClick={() => runAction(start)}
                disabled={busy || loading}
                className="text-[11px] px-2.5 py-1 bg-tf-teal/15 border border-tf-teal/25 text-tf-teal rounded hover:bg-tf-teal/25 transition-colors disabled:opacity-40"
              >
                {busy ? 'Starting…' : 'Start'}
              </button>
            )}
            {service.startup_type !== 'Disabled' && (
              <button
                onClick={() => runAction(disable)}
                disabled={busy || loading}
                className="text-[11px] px-2.5 py-1 bg-tf-amber/15 border border-tf-amber/25 text-tf-amber rounded hover:bg-tf-amber/25 transition-colors disabled:opacity-40"
              >
                {busy ? 'Disabling…' : 'Disable'}
              </button>
            )}
            {service.startup_type === 'Disabled' && (
              <button
                onClick={() => runAction(enable)}
                disabled={busy || loading}
                className="text-[11px] px-2.5 py-1 bg-tf-teal/15 border border-tf-teal/25 text-tf-teal rounded hover:bg-tf-teal/25 transition-colors disabled:opacity-40"
              >
                {busy ? 'Enabling…' : 'Enable'}
              </button>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="border-t border-tf-red/20 bg-tf-red/5 p-3 text-xs text-tf-red">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
