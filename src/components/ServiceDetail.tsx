import { type Service } from '../hooks/useServices';
import { useCorrelationStore } from '../store/correlationStore';

interface Props {
  service: Service;
  expanded: boolean;
  onToggle: () => void;
}

function stateColor(state: string) {
  switch (state) {
    case 'running':  return 'text-tf-teal';
    case 'stopped':  return 'text-tf-text/50';
    default:         return 'text-tf-amber';
  }
}

function truncate(s: string, max = 48) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function ServiceDetail({ service, expanded, onToggle }: Props) {
  const connections = useCorrelationStore(
    (s) => s.getConnectionsForService(service.pid ?? 0),
  );
  const count = connections.length;

  return (
    <div className="border border-white/8 rounded overflow-hidden">
      {/* Header */}
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

      {/* Expanded connection list */}
      {expanded && (
        <div className="border-t border-white/8 bg-black/20 p-3">
          {count === 0 ? (
            <p className="text-xs text-tf-text/35">No active connections</p>
          ) : (
            <div className="space-y-2">
              {connections.map((c) => (
                <div
                  key={`${c.pid}-${c.local_port}-${c.remote_addr}-${c.remote_port}`}
                  className="text-xs"
                >
                  {c.remote_hostname && (
                    <div className="font-mono text-tf-text/55 text-[11px]">
                      {truncate(c.remote_hostname)}
                    </div>
                  )}
                  <div className="font-mono text-tf-text/40">
                    {c.remote_addr}:{c.remote_port}
                  </div>
                  {c.plain_language && (
                    <div className="text-tf-text/50 italic mt-0.5">
                      {truncate(c.plain_language, 60)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
