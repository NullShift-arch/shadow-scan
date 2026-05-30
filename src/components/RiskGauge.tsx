interface Props {
  score: number;   // 0-100
  riskLevel: string;
}

function colorForScore(s: number): string {
  if (s <= 20) return '#14b8a6'; // teal  — safe
  if (s <= 40) return '#06b6d4'; // cyan  — low
  if (s <= 60) return '#f59e0b'; // amber — medium
  if (s <= 80) return '#f97316'; // orange — high
  return '#ef4444';              // red   — critical
}

function riskSubtitle(level: string): string {
  switch (level) {
    case 'Critical': return 'Immediate action recommended';
    case 'High':     return 'Review findings and consider blocking';
    case 'Medium':   return 'Monitor actively';
    case 'Low':      return 'Low risk detected';
    default:         return 'System appears secure';
  }
}

function riskLabelColor(level: string): string {
  switch (level) {
    case 'Critical': return '#ef4444';
    case 'High':     return '#f97316';
    case 'Medium':   return '#f59e0b';
    case 'Low':      return '#06b6d4';
    default:         return '#14b8a6';
  }
}

export function RiskGauge({ score, riskLevel }: Props) {
  const radius = 70;
  const strokeWidth = 10;

  // Use a 75% arc (270°) as the gauge sweep — more gauge-like than a full circle.
  // Angle goes from 135° (bottom-left) clockwise to 45° (bottom-right).
  const arcFraction = 0.75;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * arcFraction;
  const filledLength = arcLength * (Math.min(100, Math.max(0, score)) / 100);
  const dashOffset = arcLength - filledLength;

  // Rotate so the arc starts at bottom-left (135°) and sweeps clockwise.
  const rotation = 135;

  const color = colorForScore(score);

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        {/* Track arc */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          transform={`rotate(${rotation} 90 90)`}
          strokeLinecap="round"
        />

        {/* Fill arc */}
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${filledLength} ${circumference - filledLength}`}
          strokeDashoffset={0}
          transform={`rotate(${rotation} 90 90)`}
          strokeLinecap="round"
          style={{ transition: 'all 0.6s ease-in-out' }}
        />

        {/* Score text */}
        <text
          x="90"
          y="86"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="40"
          fontWeight="700"
          fontFamily="monospace"
          fill="white"
        >
          {score}
        </text>
        <text
          x="90"
          y="110"
          textAnchor="middle"
          fontSize="11"
          fill="rgba(224,234,244,0.45)"
        >
          / 100
        </text>
      </svg>

      {/* Risk level label */}
      <div className="mt-2 text-center">
        <div className="text-2xl font-bold" style={{ color: riskLabelColor(riskLevel) }}>
          {riskLevel.toUpperCase()}
        </div>
        <div className="text-[11px] text-tf-text/45 mt-1">{riskSubtitle(riskLevel)}</div>
      </div>
    </div>
  );
}
