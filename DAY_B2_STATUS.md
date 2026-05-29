# Day B2 Status

## Architecture change: snapshot → live stream

| Before (B1) | After (B2) |
|---|---|
| One-shot `invoke('get_connections')` on screen load | Background Rust task emits every N ms |
| New `System::new_all()` each call (~50-100 ms) | Single cached `System`, `refresh_processes()` each tick (~1-5 ms) |
| No persistence between renders | Zustand store tracks live/stale state |
| List flickered on reconnect | Stale connections fade (opacity-30), removed after 30 s |

## Rust changes

### monitors/connections.rs
- `static SYSTEM: OnceLock<Mutex<sysinfo::System>>` — one System for the app's lifetime
- `get_system()` — initialises with `new_all()` on first call, returns the mutex
- `enumerate_windows()` — now calls `sys.refresh_processes()` per tick, not `new_all()`
- `#[cfg(windows)]` guards on all Windows-specific code (SYSTEM static, helper fns)

### commands/network.rs
- `start_connection_monitor(app, interval_ms)` — async command that `tokio::spawn`s an
  infinite loop, emitting `"connections-update"` events
- Monitor is fire-and-forget; runs until app exits
- Multiple calls (e.g. on settings change) spawn extra tasks; extra events are harmless
  because the store deduplicates by connection key

### main.rs
`start_connection_monitor` added to `invoke_handler`

## TypeScript changes

### src/store/connectionStore.ts
- `Map<string, StoredConnection>` keyed by `${pid}-${local_port}-${remote_addr}-${remote_port}`
- `update()`: marks connections not seen in 5 s as stale; removes after 30 s
- `getList()`: sorted by `last_seen_ms` descending (most-recent first)
- Ephemeral — no `persist` middleware, resets on app restart

### src/hooks/useConnectionMonitor.ts
- Calls `invoke('start_connection_monitor', { intervalMs: pollMs })` on mount
- `listen('connections-update', ...)` forwards each payload to `useConnectionStore.update`
- Cleanup: calls `unlisten()` when component unmounts or `pollMs` changes

### src/App.tsx
- `useConnectionMonitor()` called at root level — monitor starts on app launch

### src/screens/NetworkScreen.tsx
- Reads from `useConnectionStore` (not `useConnections` hook)
- Stale connections: `opacity-30`, greyed border
- Active connections: `opacity-100`, coloured state badge

## Gate results
| Check | Result |
|---|---|
| `cargo fmt` | PASS |
| `cargo clippy -- -D warnings` | PASS |
| `cargo check` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (206 kB JS) |

## Manual verification (user to run)
```powershell
npm run tauri dev
# Navigate to Network tab — list populates within 2 seconds
# Open browser, navigate to a site — new connections appear within 2s
# Close browser — connections fade to grey after 5s, disappear after 30s
# Check Task Manager — CPU usage should stay < 3% while monitoring
```

## Known limitation
Calling `start_connection_monitor` multiple times (e.g. when user changes poll
interval in Settings) spawns additional Rust tasks. Extra events are deduplicated
by the store so behaviour is correct, but idle tasks persist. Fix in B3/B4 via
cancellation token or shared AtomicBool stop flag.

## Notes for Day B3 (Endpoint intelligence + classification)
- `endpoints.json` bundled via `include_str!` — JSON of known IPs/domains with
  plain-language labels (Apple, Microsoft, Google, etc.)
- Classification: match `remote_addr` against IP ranges, `remote_hostname` against
  domain patterns
- Populate `Connection.category`, `risk_level`, `plain_language` fields per connection
- Reverse DNS (async): resolve remote IPs to hostnames in background, update store
- These fields are already in the `Connection` struct — just need to fill them in
