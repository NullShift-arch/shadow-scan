import { useSystemInfo } from './hooks/useSystemInfo';

export default function App() {
  const { info, error } = useSystemInfo();

  return (
    <div className="min-h-screen bg-tf-bg text-tf-text p-8 font-mono">
      <div className="mb-8">
        <h1 className="text-tf-teal text-xl tracking-[0.2em] font-medium mb-1">
          SHADOW SCAN
        </h1>
        <p className="text-tf-text/40 text-xs tracking-widest">
          TENFOLD INDUSTRIES · DAY A3
        </p>
      </div>

      {error && (
        <div className="text-tf-red text-sm border border-tf-red/30 bg-tf-red/5 rounded p-3 mb-4">
          IPC ERROR: {error}
        </div>
      )}

      {info ? (
        <div className="border border-white/8 rounded-lg bg-white/[0.02] p-6 max-w-md">
          <p className="text-xs text-tf-text/40 tracking-widest mb-4">SYSTEM PROBE — RUST → FRONTEND</p>
          {[
            ['OS', `${info.os_name} ${info.os_version}`],
            ['HOST', info.host_name],
            ['CPU', `${info.cpu_count} cores`],
            ['RAM', `${info.total_memory_gb.toFixed(1)} GB`],
            ['UPTIME', `${Math.floor(info.uptime_seconds / 3600)}h ${Math.floor((info.uptime_seconds % 3600) / 60)}m`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-tf-text/40 text-xs">{label}</span>
              <span className="text-tf-teal text-xs">{value}</span>
            </div>
          ))}
          <div className="mt-4 pt-3 border-t border-white/8">
            <p className="text-tf-teal/60 text-xs">✓ IPC BRIDGE OPERATIONAL · DB INITIALIZED</p>
          </div>
        </div>
      ) : (
        <div className="text-tf-text/30 text-xs animate-pulse">
          QUERYING RUST BACKEND...
        </div>
      )}
    </div>
  );
}
