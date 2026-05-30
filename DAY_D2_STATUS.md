# Day D2 Status — Audit Dashboard Complete

## What was built

### components/RiskGauge.tsx (new)
- SVG circle gauge using `strokeDasharray` / `strokeDashoffset` trick
- 75% arc sweep (270°, more gauge-like than a full circle)
- Color progression:
  - 0-20: teal `#14b8a6` (Safe)
  - 21-40: cyan `#06b6d4` (Low)
  - 41-60: amber `#f59e0b` (Medium)
  - 61-80: orange `#f97316` (High)
  - 81-100: red `#ef4444` (Critical)
- CSS `transition: all 0.6s ease-in-out` on the fill arc — animates on score change
- Score number + risk level label rendered with SVG `<text>` and HTML below

### components/TrendChart.tsx (new)
- Uses `recharts` LineChart with `ResponsiveContainer` (auto-width)
- Shows past audits oldest→newest (left→right)
- Domain locked 0-100 with ticks at 0, 25, 50, 75, 100
- Custom tooltip with dark background matching app theme
- Graceful empty state: "Run more audits to see trend (N/2 needed)"

### components/ActionRecommendations.tsx (new)
- Filters to positive-impact findings (things that hurt the score)
- Sorts by `impact_points` descending, shows top 3
- Shows finding number, title, +N pts badge, description
- Empty state: teal "no actions needed" message

### hooks/useAudit.ts — auto-refresh added
- `setInterval(run, 60_000)` in the effect that also runs on mount
- `run` is stable via `useCallback([fetchHistory])` → no infinite loops
- Cleanup: `clearInterval` on unmount

### screens/AuditScreen.tsx — full dashboard
Layout (top to bottom):
1. Header + "Scan Now" button (teal, disabled during scan)
2. **Risk Gauge** — centered SVG arc in card
3. **Score Trend** — recharts sparkline (2+ audits needed)
4. **Top Actions** — top 3 high-impact findings with recommendations
5. **All Findings** — scrollable list (max-h-72) with severity borders

## Gate results
| Check | Result |
|---|---|
| `cargo clippy -- -D warnings` | ✓ (no Rust changes) |
| `npx tsc --noEmit` | ✓ |
| `npm run build` | ✓ |

## recharts installation
Was not installed. Ran `npm install recharts`. Added to `package.json`.

## SVG gauge approach
Used a 75% arc (not a full circle) for gauge semantics:
- `arcLength = circumference * 0.75`
- `dashOffset = arcLength - (score/100 * arcLength)`
- Arc rotated 135° so it starts bottom-left, sweeps through top, ends bottom-right

## Manual verification
```powershell
npm run tauri dev
# Click Audit tab
# Gauge appears immediately (auto-runs on load)
# Score animated, color matches risk level
# Click "Scan Now" multiple times → trend chart populates
# Open Chrome, visit google.com → click Scan → score may increase
# Wait 60s → silent auto-refresh updates gauge
```

## Notes for Day D3 (Final Polish)
- Restore panel: read `kill_switch_log`, show all blocks/disables
- Bulk undo: single button to remove all tenfold-* firewall rules
- Score delta indicator: +N / -N vs previous audit
- Persist last audit across sessions (show stale data until new scan completes)
- Consider adding a "first scan" loading skeleton for better first-load UX
