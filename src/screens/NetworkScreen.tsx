import { useConnections } from '../hooks/useConnections';

export function NetworkScreen() {
  const { connections, error, loading } = useConnections();

  return (
    <div className="p-6 font-mono">
      <h2 className="text-lg font-medium mb-1">Network</h2>

      {loading && (
        <p className="text-tf-text/50 text-xs animate-pulse mt-4">
          Enumerating TCP connections…
        </p>
      )}

      {error && (
        <div className="text-tf-red text-xs border border-tf-red/30 bg-tf-red/5 rounded p-3 mt-4">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="text-tf-text/40 text-xs mb-4">
            {connections.length} connection{connections.length !== 1 ? 's' : ''}
          </p>

          <div className="space-y-1">
            {connections.map((c, i) => (
              <div
                key={i}
                className="text-xs px-3 py-2 bg-white/[0.03] rounded border border-white/8
                           hover:bg-white/[0.06] transition-colors"
              >
                <div className="flex justify-between mb-1">
                  <span className="text-tf-text font-medium">{c.process_name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      c.state === 'ESTABLISHED'
                        ? 'bg-tf-teal/10 text-tf-teal'
                        : c.state === 'LISTEN'
                          ? 'bg-white/10 text-tf-text/60'
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
        </>
      )}
    </div>
  );
}
