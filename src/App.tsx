import { useSystemInfo } from './hooks/useSystemInfo';
import { useDbTest } from './hooks/useDbTest';

export default function App() {
  const { info, error: sysError } = useSystemInfo();
  const { test, result, error: dbError } = useDbTest();

  return (
    <div className="p-8 font-mono min-h-screen bg-tf-bg text-tf-text">
      <h1 className="text-tf-teal text-2xl tracking-widest mb-6">SHADOW SCAN</h1>

      {sysError && <p className="text-tf-red">{sysError}</p>}
      {info ? (
        <div className="text-xs space-y-1 mb-6">
          <div>OS: {info.os_name} {info.os_version}</div>
          <div>Host: {info.host_name}</div>
          <div>CPU: {info.cpu_count} cores</div>
          <div>RAM: {info.total_memory_gb.toFixed(1)} GB</div>
          <div>Uptime: {Math.floor(info.uptime_seconds / 3600)}h</div>
        </div>
      ) : (
        <p className="text-tf-text/50">Loading…</p>
      )}

      <button
        onClick={() => test()}
        className="px-3 py-2 bg-tf-teal/20 border border-tf-teal text-tf-teal text-sm rounded hover:bg-tf-teal/30 transition"
      >
        Test DB Write
      </button>
      {dbError && <p className="text-tf-red mt-2">{dbError}</p>}
      {result && <p className="text-tf-teal mt-2">{result}</p>}
    </div>
  );
}
