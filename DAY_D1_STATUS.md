# Day D1 Status — Audit Scoring Framework Complete

## What was built

### audit/scoring.rs (new module)

**Structs:**
- `AuditResult { score, risk_level, findings, timestamp_ms }`
- `Finding { category, severity, title, description, impact_points }`
- `AuditResult::risk_level_for_score(u32) -> String` (0-20=Safe, 21-40=Low, 41-60=Medium, 61-80=High, 81+=Critical)

**Scoring rules:**

| Rule | Condition | Impact |
|---|---|---|
| 1 | Active telemetry/tracking connections | +5 per connection |
| 2 | DiagTrack/dmwappushservice/WerSvc/SSDPSRV running | +8 per service |
| 3 | Any service with >10 connections | +3 per service |
| 4 | IPv6 connections present | +2 total |
| 5 | High-risk category connections active | +10 per connection |
| 6 | Telemetry/Update services disabled | -10 per service |

Score is clamped to 0–100.

**Key spec fixes:**
- Removed `!c.stale` filter — `enumerate_tcp_connections()` always returns fresh data; stale is a frontend concept only
- Used `matches!(s.state, ServiceState::Running)` instead of `.to_string() == "running"` — ServiceState doesn't implement Display
- Used `matches!(s.startup_type, StartupType::Disabled)` for same reason
- Used `svc.pid.map_or(false, |pid| c.pid == pid)` (via `if let Some(pid)`) for safe PID comparison

### commands/audit.rs (new)
- `run_audit_cmd()` — enumerates connections + services, runs scoring, stores in `audit_results`, returns `AuditResult`
- `get_audit_history(limit: i32)` — reads past audits from DB, returns `Vec<AuditResult>`
- Uses `sqlx::query_as::<_, (i64, i32, String)>` (not `query!` macro) to avoid compile-time DB introspection

### hooks/useAudit.ts (new)
- `useAudit()` → `{ audit, history, run, loading, error }`
- Runs automatically on mount; `run()` is stable via `useCallback`
- History refreshed after each `run()` call

### screens/AuditScreen.tsx (rewritten from stub)
- Large `score` (6xl font) + `risk_level` side by side in card
- **Risk Factors** section: findings with `impact_points > 0` (what's hurting the score)
- **Protections Active** section: findings with `impact_points < 0` (what's helping)
- History chips show past scores + dates at bottom
- "Run Audit" button triggers a new scan and DB write

### Sidebar — verified existing
`{ id: 'audit', label: 'Audit', icon: Shield }` was already wired in Week A.

## Gate results
| Check | Result |
|---|---|
| `cargo fmt` | ✓ |
| `cargo clippy -- -D warnings` | ✓ |
| `cargo check` | ✓ |
| `npx tsc --noEmit` | ✓ |
| `npm run build` | ✓ |

## Manual verification
```powershell
npm run tauri dev
# Click "Audit" tab — auto-runs on load
# Score appears (expect 5-50 depending on active connections)
# Risk factors listed with impact points
# Open Chrome, go to google.com
# Click "Run Audit" again — score should increase from tracking connections
# In SQLite:
sqlite3 "$env:APPDATA\com.tenfold.shadowscan\shadow_scan.db"
.tables
SELECT ts, score FROM audit_results ORDER BY ts DESC LIMIT 5;
```

## Notes for Day D2 (Visual Dashboard)
- Add circular/arc risk gauge (SVG, colored by risk level)
- Trend line: past 10 scores plotted as sparkline
- "What should I do?" action panel derived from highest-impact findings
- Auto-refresh audit every 60 seconds (live risk monitoring)
- Score delta indicator (↑ or ↓ vs previous audit)
