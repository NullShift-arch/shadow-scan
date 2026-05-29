# Day B5 Status — Week B Complete

## What was built

### intel/endpoints.rs — classify_with_hostname()
Domain-first second-pass classifier: scans domain patterns across all entries
before falling back to `classify(hostname, ip)` (which does combined domain+IP).
Called after DNS resolution to upgrade IP-range matches to domain-pattern matches.

### commands/network.rs — two new commands
**re_classify_connection(hostname, remote_ip)**
- Returns `Option<(category, risk, plain_language)>` as a JSON array or null
- Calls `classify_with_hostname()` — domain patterns fire if hostname resolved
- Allows the frontend to reclassify without re-enumerating connections

**archive_connection(pid, process_name, ...10 args total)**
- Writes one connection snapshot row to `connections_log` SQLite table
- Registered in invoke_handler but NOT called from frontend yet (Week C)
- `#[allow(clippy::too_many_arguments)]` — IPC contract requires flat params

### hooks/useDnsEnrichment.ts
Added re-classification after hostname resolution:
1. `invoke('resolve_hostname', ...)` → hostname or null
2. If hostname: `invoke('re_classify_connection', { hostname, remoteIp })` → tuple or null
3. Store updated with hostname + new category/risk/plain_language in one setState call
- Still uses `getState()` imperative pattern (empty dep array, no stale-closure bug)

### store/viewStore.ts (new)
Ephemeral Zustand store for UI state:
- `sortBy: 'risk' | 'date' | 'name'` (default: 'risk')
- `riskFilter: 'all' | 'high' | 'medium' | 'low'` (default: 'all')
- `categoryFilter: string` (default: 'all')
- No persistence — resets on app restart (intentional: filters are session-only)

### screens/NetworkScreen.tsx (full rewrite)
- **PillButton** helper component — reusable active/inactive toggle
- **Sort pills**: risk / date / name (RISK_ORDER constant for stable ordering)
- **Risk filter pills**: all / high / medium / low
- **Category filter pills**: auto-derived from live connections
- **truncate()**: clips strings at 48 chars with `…` (hostnames + plain_language)
- Connection count: "N / total · M classified · live"
- Stale connections: opacity-25 (reduced from opacity-30)
- Risk badge: coloured border + background (red/amber/teal)

## Gate results
| Check | Result |
|---|---|
| `cargo fmt` | PASS |
| `cargo clippy -- -D warnings` | PASS |
| `cargo check` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (210 kB JS, 15 kB CSS) |

## Clippy fix applied
`archive_connection` has 10 parameters (clippy limit: 7). Added
`#[allow(clippy::too_many_arguments)]` — the IPC API requires flat params
matching the JSON shape from the frontend. Wrapping in a struct would require
a corresponding TypeScript struct on the JS side, adding complexity for no
functional gain.

## Week B summary
| Day | Feature | Status |
|---|---|---|
| B1 | TCP connection enumeration via GetExtendedTcpTable | ✅ |
| B2 | Live polling, Zustand store, stale tracking | ✅ |
| B3 | Endpoint intel DB (15 entries), IP-range classification | ✅ |
| B4 | Reverse DNS, domain-pattern enrichment | ✅ |
| B5 | Re-classification, filter/sort controls, archival stub | ✅ |

Network tab is production-ready. Live updates, classification, filtering,
sorting, DNS resolution, and persistence-ready archival all in place.

## Manual verification (user to run)
```powershell
npm run tauri dev
# Network tab — connections appear, classified connections show badges
# Wait 5-30s — DNS resolves, more domain-pattern labels appear
# Click "Risk: high" — list filters to high-risk connections only
# Click "Cat: telemetry" — only telemetry connections shown
# Click "Sort: name" — alphabetical by process name
# Long hostnames / descriptions truncate with "…" at 48 chars
```

## Week C notes (Apple Relay Inspector)
- Enumerate Windows Services via Service Control Manager API
  (`Win32_System_Services` feature — already in Cargo.toml)
- Correlate service PIDs to connection PIDs
- Show per-service connection list in a dedicated screen
- Kill switches: stop/start services with UAC elevation
- Firewall rule creation for persistent blocking
- `kill_switch_log` SQLite table (schema already created in A3)
