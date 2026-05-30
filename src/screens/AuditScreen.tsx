import { useAudit, type Finding } from '../hooks/useAudit';
import { RiskGauge } from '../components/RiskGauge';
import { TrendChart } from '../components/TrendChart';
import { ActionRecommendations } from '../components/ActionRecommendations';
import { RestorePanel } from '../components/RestorePanel';
import { ScoreDelta } from '../components/ScoreDelta';

function severityBorder(severity: string) {
  switch (severity) {
    case 'critical': return 'border-tf-red/30 bg-tf-red/[0.04]';
    case 'high':     return 'border-tf-amber/30 bg-tf-amber/[0.04]';
    case 'medium':   return 'border-tf-amber/20 bg-tf-amber/[0.02]';
    case 'low':      return 'border-tf-teal/20 bg-tf-teal/[0.02]';
    default:         return 'border-white/10 bg-white/[0.02]';
  }
}

function FindingRow({ f }: { f: Finding }) {
  const sign = f.impact_points > 0 ? '+' : '';
  return (
    <div className={`border rounded p-3 text-xs space-y-0.5 ${severityBorder(f.severity)}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{f.title}</span>
        <span className="font-mono text-tf-text/40 text-[10px] shrink-0">
          {sign}{f.impact_points} pts
        </span>
      </div>
      <p className="text-tf-text/55 leading-snug">{f.description}</p>
    </div>
  );
}

export function AuditScreen() {
  const { audit, history, loading, error, run } = useAudit();

  // history[0] = current scan, history[1] = previous scan
  const previousAudit = history.length > 1 ? history[1] : null;
  const ts = audit ? new Date(audit.timestamp_ms).toLocaleTimeString() : null;

  return (
    <div className="p-6 max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-medium">Audit Dashboard</h2>
          <p className="text-tf-text/40 text-xs mt-0.5">
            Real-time risk assessment{ts ? ` · last scanned ${ts}` : ''}
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="text-[11px] px-3 py-1 rounded border border-tf-teal/25 bg-tf-teal/10 hover:bg-tf-teal/20 text-tf-teal transition-colors disabled:opacity-40"
        >
          {loading ? 'Scanning…' : 'Scan Now'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 text-xs text-tf-red border border-tf-red/20 rounded bg-tf-red/5">
          {error}
        </div>
      )}

      {!audit && loading && (
        <p className="text-tf-text/40 text-xs animate-pulse">Running first audit…</p>
      )}

      {audit && (
        <div className="space-y-5">
          {/* Risk gauge + score delta */}
          <div className="border border-white/8 rounded-lg p-6 bg-white/[0.02]">
            <div className="flex flex-col items-center gap-3">
              <RiskGauge score={audit.score} riskLevel={audit.risk_level} />
              {previousAudit && (
                <ScoreDelta current={audit} previous={previousAudit} />
              )}
            </div>
          </div>

          {/* Score trend */}
          <div className="border border-white/8 rounded-lg p-5 bg-white/[0.02]">
            <h3 className="text-[10px] font-medium text-tf-text/40 uppercase tracking-widest mb-3">
              Score Trend
            </h3>
            <TrendChart history={history} />
          </div>

          {/* Top actions */}
          <div className="border border-white/8 rounded-lg p-5 bg-white/[0.02]">
            <h3 className="text-[10px] font-medium text-tf-text/40 uppercase tracking-widest mb-3">
              Top Actions
            </h3>
            <ActionRecommendations findings={audit.findings} />
          </div>

          {/* Restore panel */}
          <RestorePanel />

          {/* All findings */}
          {audit.findings.length > 0 && (
            <div className="border border-white/8 rounded-lg p-5 bg-white/[0.02]">
              <h3 className="text-[10px] font-medium text-tf-text/40 uppercase tracking-widest mb-3">
                All Findings ({audit.findings.length})
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {audit.findings.map((f, i) => (
                  <FindingRow key={i} f={f} />
                ))}
              </div>
            </div>
          )}

          {audit.findings.length === 0 && (
            <div className="border border-tf-teal/20 rounded-lg p-5 bg-tf-teal/[0.03] text-center">
              <p className="text-tf-teal text-sm">No findings — system appears secure.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
