import { useConnectionStore } from '../store/connectionStore';

function riskBadge(risk?: string) {
  switch (risk) {
    case 'high':
      return 'bg-tf-red/10 text-tf-red border-tf-red/30';
    case 'medium':
      return 'bg-tf-amber/10 text-tf-amber border-tf-amber/30';
    case 'low':
      return 'bg-tf-teal/10 text-tf-teal border-tf-teal/30';
    default:
      return null;
  }
}

export function NetworkScreen() {
  const connections = useConnectionStore((s) => s.getList());
  const count = useConnectionStore((s) => s.count());

  const classified = connections.filter((c) => c.category).length;

  return (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-lg font-medium">Network</h2>
        <p className="text-tf-text/40 text-xs mt-1">
          {count} connection{count !== 1 ? 's' : ''} · {classified} classified · live
        </p>
      </div>

      {count === 0 ? (
        <p className="text-tf-text/50 text-xs animate-pulse mt-8">
          Waiting for first poll…
        </p>
      ) : (
        <div className="space-y-2">
          {connections.map((c) => {
            const badge = riskBadge(c.risk_level);
            return (
              <div
                key={`${c.pid}-${c.local_port}-${c.remote_addr}-${c.remote_port}`}
                className={`p-3 rounded border text-xs transition-opacity duration-500 ${
                  c.stale
                    ? 'opacity-25 bg-white/[0.01] border-white/5'
                    : 'bg-white/[0.03] border-white/8'
                }`}
              >
                {/* Row 1: process name + risk badge */}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-tf-text">{c.process_name}</span>
                  {badge && c.risk_level && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge}`}>
                      {c.risk_level.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Row 2: plain-language description */}
                {c.plain_language && (
                  <p className="text-tf-text/65 mb-2 leading-snug">{c.plain_language}</p>
                )}

                {/* Row 3: technical details */}
                <div className="font-mono text-tf-text/50">
                  {c.local_addr}:{c.local_port} → {c.remote_addr}:{c.remote_port}
                </div>

                {/* Row 4: category + state */}
                <div className="flex gap-2 mt-1 text-tf-text/40">
                  {c.category && <span>[{c.category}]</span>}
                  <span>{c.state}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
