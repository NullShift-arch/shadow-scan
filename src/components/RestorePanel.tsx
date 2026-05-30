import { useState } from 'react';
import { useKillSwitchLog } from '../hooks/useKillSwitchLog';

function actionColor(action: string) {
  switch (action) {
    case 'block':
    case 'disable':
    case 'stop':
      return 'text-tf-red';
    case 'unblock':
    case 'enable':
    case 'start':
    case 'restore_all':
      return 'text-tf-teal';
    default:
      return 'text-tf-text/50';
  }
}

export function RestorePanel() {
  const { log, loading, error, restoreAll } = useKillSwitchLog(30);
  const [confirming, setConfirming] = useState(false);

  // Active = "block" or "disable" entries that haven't been subsequently reversed.
  const active = log.filter(
    (e) => ['block', 'disable'].includes(e.action) && e.success,
  );

  const handleRestoreAll = async () => {
    const ok = await restoreAll();
    if (ok) setConfirming(false);
  };

  return (
    <div className="border border-white/8 rounded-lg p-5 bg-white/[0.02]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-medium text-tf-text/40 uppercase tracking-widest">
          Kill-Switch Log &amp; Restore
        </h3>
        {active.length > 0 && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-tf-red/10 text-tf-red border border-tf-red/20">
            {active.length} active
          </span>
        )}
      </div>

      {error && (
        <div className="mb-3 p-2 text-xs text-tf-red border border-tf-red/20 rounded bg-tf-red/5">
          {error}
        </div>
      )}

      {/* Log entries */}
      {log.length === 0 ? (
        <p className="text-xs text-tf-text/35">No kill-switch actions recorded yet.</p>
      ) : (
        <div className="max-h-40 overflow-y-auto mb-4 space-y-0.5">
          {log.map((e, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-[10px] font-mono py-0.5"
            >
              <span>
                <span className={`uppercase font-semibold ${actionColor(e.action)}`}>
                  {e.action}
                </span>
                <span className="text-tf-text/40"> {e.target_type}:</span>
                <span className="text-tf-text/60"> {e.target_name}</span>
              </span>
              <span className="text-tf-text/25 shrink-0 ml-2">
                {new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Restore button */}
      {active.length === 0 ? (
        <p className="text-xs text-tf-text/35">
          Nothing to restore — system is in a clean state.
        </p>
      ) : confirming ? (
        <div className="p-3 border border-tf-red/25 rounded bg-tf-red/[0.04] space-y-2">
          <p className="text-xs font-semibold text-tf-red">Confirm restore?</p>
          <p className="text-[11px] text-tf-text/55">
            This will unblock {active.filter((e) => e.action === 'block').length} IP
            {active.filter((e) => e.action === 'block').length !== 1 ? 's' : ''} and
            re-enable {active.filter((e) => e.action === 'disable').length} service
            {active.filter((e) => e.action === 'disable').length !== 1 ? 's' : ''}.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleRestoreAll}
              disabled={loading}
              className="flex-1 text-[11px] py-1 bg-tf-red/15 border border-tf-red/25 text-tf-red rounded hover:bg-tf-red/25 transition-colors disabled:opacity-40"
            >
              {loading ? 'Restoring…' : 'Yes, Restore All'}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="flex-1 text-[11px] py-1 bg-white/[0.03] border border-white/10 text-tf-text/55 rounded hover:bg-white/[0.06] transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          className="w-full text-[11px] py-1.5 bg-tf-red/10 border border-tf-red/20 text-tf-red rounded hover:bg-tf-red/20 transition-colors"
        >
          Restore All ({active.length})
        </button>
      )}
    </div>
  );
}
