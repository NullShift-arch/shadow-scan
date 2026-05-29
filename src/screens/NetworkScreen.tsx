import { useConnectionStore } from '../store/connectionStore';

export function NetworkScreen() {
  const connections = useConnectionStore((s) => s.getList());
  const count = useConnectionStore((s) => s.count());

  return (
    <div className="p-6 font-mono">
      <h2 className="text-lg font-medium mb-1">Network</h2>
      <p className="text-tf-text/40 text-xs mb-4">
        {count} connection{count !== 1 ? 's' : ''} · live
      </p>

      {count === 0 ? (
        <p className="text-tf-text/50 text-xs animate-pulse">
          Waiting for first poll…
        </p>
      ) : (
        <div className="space-y-1">
          {connections.map((c) => (
            <div
              key={`${c.pid}-${c.local_port}-${c.remote_addr}-${c.remote_port}`}
              className={`text-xs px-3 py-2 rounded border transition-opacity duration-500 ${
                c.stale
                  ? 'opacity-30 bg-white/[0.01] border-white/5'
                  : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex justify-between mb-1">
                <span className="text-tf-text font-medium">{c.process_name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    c.state === 'ESTABLISHED'
                      ? 'bg-tf-teal/10 text-tf-teal'
                      : c.state === 'LISTEN'
                        ? 'bg-white/10 text-tf-text/50'
                        : 'bg-tf-amber/10 text-tf-amber'
                  }`}
                >
                  {c.state}
                </span>
              </div>
              <div className="text-tf-text/50">
                {c.local_addr}:{c.local_port} → {c.remote_addr}:{c.remote_port}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
