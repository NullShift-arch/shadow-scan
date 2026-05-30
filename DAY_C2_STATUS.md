# Day C2 Status — Service-to-Connection Correlation

## What was built

### store/correlationStore.ts (new)
- `Map<number, StoredConnection[]>` — PID → active connections
- `updateConnections(connections)` — groups non-stale connections by PID
- `getConnectionsForService(pid)` — O(1) lookup for a service's connections
- `getConnectionCountForService(pid)` — count for badge rendering

### store/connectionStore.ts — export + correlation hook
- `StoredConnection` exported (needed by correlationStore type)
- After each update cycle, calls `useCorrelationStore.getState().updateConnections()`
  so correlation stays in sync without additional event wiring

### hooks/useConnectionMonitor.ts — belt-and-suspenders update
- After forwarding payload to `connectionStore.update()`, also pushes raw
  payload to `correlationStore.updateConnections()` directly
- Ensures correlation reflects the very latest poll even during the brief
  window before stale logic runs in connectionStore

### components/ServiceDetail.tsx (new)
- Collapsible card: header shows display_name, service name, PID, state badge, connection count badge
- Connection count badge (teal) only appears when count > 0
- Expanded view: hostname → IP:port → plain_language description per connection
- `truncate()` at 48 / 60 chars to keep UI clean
- Expansion state is controlled by parent (no internal state)

### screens/AppleRelayScreen.tsx — full rewrite
- Shows only **running** services (stopped/disabled are noise)
- Sorted: services with active connections first, then alphabetical
- Subtitle: "N running · M active · K connections total"
- Each service row is a `ServiceDetail` — click to expand/collapse
- Collapsed `<details>` panel at bottom shows all services (debug)
- Expansion state tracked as `Set<number>` of PIDs (persists across connection updates)

## Gate results
| Check | Result |
|---|---|
| `cargo fmt` | ✓ |
| `cargo clippy -- -D warnings` | ✓ (fixed two unused Result warnings on CloseServiceHandle) |
| `npx tsc --noEmit` | ✓ |
| `npm run build` | ✓ |

## Commit
- `c723b89` — Day C2: Service-to-connection correlation with hierarchical UI
- Also includes C1 files that were pending (services.rs, services command, hooks, AppleRelayScreen initial)
- Tag: `v0.3.3-beta`

## Manual verification
```powershell
npm run tauri dev
# Click "Apple Relay" in sidebar
# See list of running services (sorted: active first)
# Services with connections show teal badge "N"
# Click any service → expands to show connections
# svchost.exe entries typically own most connections
# Connection rows: hostname (if resolved) + IP:port + plain-language label
```

## Notes for Day C3 (Kill Switches)
- `ServiceDetail` already has the service + connection data in scope
- Add a "Stop" button to each service row (calls `stop_service(name)` Rust command)
- Rust command: `ControlService(svc, SERVICE_CONTROL_STOP, ...)` with UAC elevation
  (services require elevated process — use `runas` or ShellExecuteEx with elevation)
- Log action to `kill_switch_log` SQLite table (already created in A3)
- After stop: re-invoke `get_services()` to refresh the list
- Add a "Restart" button for services that were stopped by us
