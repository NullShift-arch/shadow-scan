import { type Finding } from '../hooks/useAudit';

interface Props {
  findings: Finding[];
}

export function ActionRecommendations({ findings }: Props) {
  const top = [...findings]
    .filter((f) => f.impact_points > 0)
    .sort((a, b) => b.impact_points - a.impact_points)
    .slice(0, 3);

  if (top.length === 0) {
    return (
      <p className="text-xs text-tf-teal">
        No critical actions needed — your system is well-protected.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {top.map((f, i) => (
        <div
          key={i}
          className="border border-tf-amber/25 bg-tf-amber/[0.04] rounded p-3 text-xs"
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="font-semibold text-tf-amber">
              {i + 1}. {f.title}
            </span>
            <span className="text-[10px] font-mono text-tf-amber/60 shrink-0">
              +{f.impact_points} pts
            </span>
          </div>
          <p className="text-tf-text/60 leading-snug">{f.description}</p>
        </div>
      ))}
    </div>
  );
}
