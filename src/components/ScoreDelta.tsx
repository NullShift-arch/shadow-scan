import { type AuditResult } from '../hooks/useAudit';

interface Props {
  current: AuditResult;
  previous: AuditResult | null;
}

export function ScoreDelta({ current, previous }: Props) {
  if (!previous) return null;

  const delta = current.score - previous.score;
  if (delta === 0) return null;

  const improved = delta < 0;

  return (
    <div
      className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded border ${
        improved
          ? 'bg-tf-teal/10 border-tf-teal/25 text-tf-teal'
          : 'bg-tf-red/10 border-tf-red/25 text-tf-red'
      }`}
    >
      <span>{improved ? '↓' : '↑'}</span>
      <span>{Math.abs(delta)} pts</span>
    </div>
  );
}
