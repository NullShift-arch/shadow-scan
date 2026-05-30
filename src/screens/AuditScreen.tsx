import { useAudit, type Finding } from '../hooks/useAudit';

function riskColor(risk: string) {
  switch (risk) {
    case 'Critical': return 'text-tf-red';
    case 'High':     return 'text-tf-amber';
    case 'Medium':   return 'text-tf-amber/70';
    case 'Low':      return 'text-tf-teal';
    case 'Safe':     return 'text-tf-teal';
    default:         return 'text-tf-text/60';
  }
}

function severityBorder(severity: string) {
  switch (severity) {
    case 'critical': return 'border-tf-red/30 bg-tf-red/5';
    case 'high':     return 'border-tf-amber/30 bg-tf-amber/5';
    case 'medium':   return 'border-tf-amber/20 bg-tf-amber/[0.03]';
    case 'low':      return 'border-tf-teal/20 bg-tf-teal/[0.03]';
    default:         return 'border-white/10 bg-white/[0.02]';
  }
}

function FindingCard({ f }: { f: Finding }) {
  const sign = f.impact_points > 0 ? '+' : '';
  const suffix = f.impact_points < 0 ? ' (protected)' : ' pts';

  return (
    <div className={`border rounded p-3 text-xs space-y-1 ${severityBorder(f.severity)}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">{f.title}</span>
        <span className="text-tf-text/40 whitespace-nowrap font-mono text-[10px]">
          {sign}{f.impact_points}{suffix}
        </span>
      </div>
      <p className="text-tf-text/60 leading-snug">{f.description}</p>
      <span className="inline-block text-[10px] text-tf-text/35 px-1 border border-white/10 rounded">
        {f.category}
      </span>
    </div>
  );
}

export function AuditScreen() {
  const { audit, history, run, loading, error } = useAudit();

  const riskFactors   = audit?.findings.filter((f) => f.impact_points > 0) ?? [];
  const protections   = audit?.findings.filter((f) => f.impact_points < 0) ?? [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-medium">Audit</h2>
          <p className="text-tf-text/40 text-xs mt-0.5">
            System risk snapshot · {audit?.findings.length ?? 0} finding{audit?.findings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={run}
          disabled={loading}
          className="text-[11px] px-3 py-1 rounded border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-tf-text/60 transition-colors disabled:opacity-40"
        >
          {loading ? 'Scanning…' : 'Run Audit'}
        </button>
      </div>

      {error && (
        <div className="text-tf-red text-xs mb-4 p-3 border border-tf-red/20 rounded bg-tf-red/5">
          {error}
        </div>
      )}

      {!audit && !loading && (
        <p className="text-tf-text/40 text-xs mt-8">No audit data yet.</p>
      )}

      {audit && (
        <div className="space-y-6">
          {/* Score card */}
          <div className="border border-white/10 rounded-lg p-6 bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-tf-text/45 text-xs mb-2">Risk Score</p>
                <div className="text-6xl font-bold font-mono tracking-tight">
                  {audit.score}
                </div>
                <p className="text-tf-text/30 text-xs mt-2">
                  {new Date(audit.timestamp_ms).toLocaleString()}
                </p>
              </div>
              <div className={`text-4xl font-bold ${riskColor(audit.risk_level)}`}>
                {audit.risk_level.toUpperCase()}
              </div>
            </div>
          </div>

          {/* Risk factors */}
          {riskFactors.length > 0 && (
            <div>
              <h3 className="text-[10px] font-medium text-tf-text/40 mb-2 uppercase tracking-widest">
                Risk Factors
              </h3>
              <div className="space-y-2">
                {riskFactors.map((f, i) => <FindingCard key={i} f={f} />)}
              </div>
            </div>
          )}

          {/* Protections in place */}
          {protections.length > 0 && (
            <div>
              <h3 className="text-[10px] font-medium text-tf-text/40 mb-2 uppercase tracking-widest">
                Protections Active
              </h3>
              <div className="space-y-2">
                {protections.map((f, i) => <FindingCard key={i} f={f} />)}
              </div>
            </div>
          )}

          {audit.findings.length === 0 && (
            <p className="text-tf-teal text-sm">No findings — system appears clean.</p>
          )}

          {/* History chips */}
          {history.length > 1 && (
            <div className="pt-4 border-t border-white/8">
              <h3 className="text-[10px] font-medium text-tf-text/35 mb-2 uppercase tracking-widest">
                Past Audits
              </h3>
              <div className="flex gap-1.5 flex-wrap">
                {history.map((h, i) => (
                  <div
                    key={i}
                    className={`text-[10px] px-2 py-0.5 rounded border ${
                      i === 0
                        ? 'border-white/20 text-tf-text/60'
                        : 'border-white/8 text-tf-text/30'
                    }`}
                  >
                    <span className={`font-mono font-bold ${riskColor(h.risk_level)}`}>
                      {h.score}
                    </span>
                    <span className="text-tf-text/25 ml-1">
                      {new Date(h.timestamp_ms).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
