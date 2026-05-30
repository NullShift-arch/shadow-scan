import { useConnectionStore } from '../store/connectionStore';
import { useViewStore, type SortBy, type RiskFilter } from '../store/viewStore';

const RISK_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };
const riskVal = (r?: string) => RISK_ORDER[r ?? ''] ?? 3;

function riskBadgeClass(risk?: string) {
  switch (risk) {
    case 'high':   return 'bg-tf-red/10 text-tf-red border-tf-red/30';
    case 'medium': return 'bg-tf-amber/10 text-tf-amber border-tf-amber/30';
    case 'low':    return 'bg-tf-teal/10 text-tf-teal border-tf-teal/30';
    default:       return null;
  }
}

function truncate(s: string, max = 48): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded border transition-colors ${
        active
          ? 'bg-tf-teal/15 text-tf-teal border-tf-teal/30'
          : 'bg-white/[0.03] text-tf-text/55 border-white/10 hover:text-tf-text hover:bg-white/[0.06]'
      }`}
    >
      {children}
    </button>
  );
}

export function NetworkScreen() {
  const allConnections = useConnectionStore((s) => s.getList());
  const totalCount    = useConnectionStore((s) => s.count());
  const sortBy = useViewStore((s) => s.sortBy);
  const riskFilter = useViewStore((s) => s.riskFilter);
  const categoryFilter = useViewStore((s) => s.categoryFilter);
  const setSortBy = useViewStore((s) => s.setSortBy);
  const setRiskFilter = useViewStore((s) => s.setRiskFilter);
  const setCategoryFilter = useViewStore((s) => s.setCategoryFilter);

  // Derive category list from live connections.
  const categories = Array.from(
    new Set(allConnections.map((c) => c.category).filter((c): c is string => !!c)),
  ).sort();

  // Filter.
  const filtered = allConnections.filter((c) => {
    if (riskFilter !== 'all' && c.risk_level !== riskFilter) return false;
    if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
    return true;
  });

  // Sort.
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'risk':  return riskVal(a.risk_level) - riskVal(b.risk_level);
      case 'date':  return b.last_seen_ms - a.last_seen_ms;
      case 'name':  return a.process_name.localeCompare(b.process_name);
      default:      return 0;
    }
  });

  const classified = allConnections.filter((c) => c.category).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-lg font-medium">Network</h2>
        <p className="text-tf-text/40 text-xs mt-0.5">
          {sorted.length} / {totalCount} · {classified} classified · live
        </p>
      </div>

      {/* Sort controls */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-tf-text/40">Sort:</span>
        {(['risk', 'date', 'name'] as SortBy[]).map((s) => (
          <PillButton key={s} active={sortBy === s} onClick={() => setSortBy(s)}>
            {s}
          </PillButton>
        ))}
      </div>

      {/* Risk filter */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs text-tf-text/40">Risk:</span>
        {(['all', 'high', 'medium', 'low'] as RiskFilter[]).map((r) => (
          <PillButton key={r} active={riskFilter === r} onClick={() => setRiskFilter(r)}>
            {r}
          </PillButton>
        ))}
      </div>

      {/* Category filter — only shown when categories exist */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className="text-xs text-tf-text/40">Cat:</span>
          <PillButton active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>
            all
          </PillButton>
          {categories.map((cat) => (
            <PillButton
              key={cat}
              active={categoryFilter === cat}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </PillButton>
          ))}
        </div>
      )}

      {/* Connection list */}
      {sorted.length === 0 ? (
        <p className="text-tf-text/40 text-xs mt-8 animate-pulse">
          {totalCount === 0 ? 'Waiting for first poll…' : 'No connections match the current filters.'}
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map((c) => {
            const badge = riskBadgeClass(c.risk_level);
            return (
              <div
                key={`${c.pid}-${c.local_port}-${c.remote_addr}-${c.remote_port}`}
                className={`p-3 rounded border text-xs transition-opacity duration-500 ${
                  c.stale
                    ? 'opacity-25 bg-white/[0.01] border-white/5'
                    : 'bg-white/[0.03] border-white/8'
                }`}
              >
                {/* Process + risk badge */}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-tf-text">{c.process_name}</span>
                  {badge && c.risk_level && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge}`}>
                      {c.risk_level.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Plain-language description */}
                {c.plain_language && (
                  <p className="text-tf-text/60 mb-1.5 leading-snug">
                    {truncate(c.plain_language)}
                  </p>
                )}

                {/* Resolved hostname */}
                {c.remote_hostname && (
                  <div className="font-mono text-tf-text/50 text-[11px] mb-0.5">
                    {truncate(c.remote_hostname)}
                  </div>
                )}

                {/* IP:port row */}
                <div className="font-mono text-tf-text/45">
                  {c.local_addr}:{c.local_port} → {c.remote_addr}:{c.remote_port}
                </div>

                {/* Category + state */}
                <div className="flex gap-2 mt-1 text-tf-text/35">
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
