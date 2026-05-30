import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { type AuditResult } from '../hooks/useAudit';

interface Props {
  history: AuditResult[];
}

export function TrendChart({ history }: Props) {
  if (history.length < 2) {
    return (
      <p className="text-xs text-tf-text/45">
        Run more audits over time to see the trend. ({history.length}/2 needed)
      </p>
    );
  }

  const data = [...history]
    .reverse()
    .map((h, i) => ({
      idx: i + 1,
      score: h.score,
      label: new Date(h.timestamp_ms).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis
          dataKey="label"
          tick={{ fill: 'rgba(224,234,244,0.35)', fontSize: 10 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: 'rgba(224,234,244,0.35)', fontSize: 10 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          tickLine={false}
          ticks={[0, 25, 50, 75, 100]}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(8,12,16,0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            fontSize: 11,
            padding: '6px 10px',
          }}
          labelStyle={{ color: '#e0eaf4', marginBottom: 2 }}
          formatter={(value) => {
            const numValue = typeof value === 'number' ? value : parseInt(String(value), 10);
            return `Score: ${numValue}`;
          }}
          labelFormatter={(label) => `Audit at ${label}`}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke="#14b8a6"
          strokeWidth={2}
          dot={{ fill: '#14b8a6', r: 3, strokeWidth: 0 }}
          activeDot={{ r: 5, strokeWidth: 0 }}
          isAnimationActive
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
