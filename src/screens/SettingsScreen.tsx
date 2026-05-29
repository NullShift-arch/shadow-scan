import { useSettingsStore } from '../store/settingsStore';
import { useSystemInfo } from '../hooks/useSystemInfo';

export function SettingsScreen() {
  const {
    pollIntervalMs,
    retentionDays,
    showDevTools,
    setPollInterval,
    setRetentionDays,
    toggleDevTools,
  } = useSettingsStore();
  const { info } = useSystemInfo();

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-lg font-medium mb-6">Settings</h2>

      <section className="mb-8">
        <label className="block text-sm text-tf-text/60 mb-2">
          Connection poll interval (affects CPU usage)
        </label>
        <select
          value={pollIntervalMs}
          onChange={(e) => setPollInterval(Number(e.target.value))}
          className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm w-full"
        >
          <option value={1000}>1 second (high CPU)</option>
          <option value={2000}>2 seconds (balanced)</option>
          <option value={5000}>5 seconds (low CPU)</option>
          <option value={10000}>10 seconds (minimal)</option>
        </select>
      </section>

      <section className="mb-8">
        <label className="block text-sm text-tf-text/60 mb-2">
          Connection log retention
        </label>
        <select
          value={retentionDays}
          onChange={(e) => setRetentionDays(Number(e.target.value))}
          className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm w-full"
        >
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
        </select>
      </section>

      <section className="mb-8 flex items-center gap-3">
        <input
          type="checkbox"
          id="devtools"
          checked={showDevTools}
          onChange={() => toggleDevTools()}
          className="w-4 h-4 accent-tf-teal"
        />
        <label htmlFor="devtools" className="text-sm text-tf-text/60">
          Show developer tools (console, network inspector)
        </label>
      </section>

      <hr className="border-white/10 my-8" />

      <section className="mt-8">
        <h3 className="text-sm font-medium mb-4 text-tf-text/60">System Information</h3>
        {info ? (
          <div className="text-xs font-mono space-y-2 text-tf-text/50">
            <div>OS: {info.os_name} {info.os_version}</div>
            <div>Host: {info.host_name}</div>
            <div>CPU: {info.cpu_count} cores</div>
            <div>RAM: {info.total_memory_gb.toFixed(1)} GB</div>
            <div>
              Uptime: {Math.floor(info.uptime_seconds / 3600)}h{' '}
              {Math.floor((info.uptime_seconds % 3600) / 60)}m
            </div>
          </div>
        ) : (
          <p className="text-tf-text/30 text-xs">Loading…</p>
        )}
      </section>

      <section className="mt-8 pt-8 border-t border-white/10">
        <p className="text-xs text-tf-text/30">
          Shadow Scan v0.0.1-alpha | {new Date().getFullYear()}
        </p>
      </section>
    </div>
  );
}
