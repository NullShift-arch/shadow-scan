# Day B1 Status

## What was built

### monitors/connections.rs
- `Connection` struct — all fields including enrichment stubs (always compiled)
- `enumerate_tcp_connections()` — public dispatcher, Windows impl in `enumerate_windows()`
- Windows implementation uses `GetExtendedTcpTable` from `Win32_NetworkManagement_IpHelper`
- Process names via `sysinfo::System::new_all()` + `sys.process(Pid::from(pid as usize))`
- Helper functions `ip_from_u32`, `port_from_u32`, `state_from_u32` all `#[cfg(windows)]`

### commands/network.rs
- `get_connections()` Tauri command — thin wrapper over `enumerate_tcp_connections()`
- Registered in `commands/mod.rs` and `main.rs` invoke_handler

### Frontend
- `src/hooks/useConnections.ts` — invokes `get_connections`, returns typed `Connection[]`
- `src/screens/NetworkScreen.tsx` — lists connections with process name, addr:port, state badge

## Windows API fix discovered
`GetExtendedTcpTable` in windows crate 0.56 takes `Option<*mut c_void>` for the
buffer parameter (not `*mut c_void`):
- First call (size probe): `None`
- Second call (real data): `Some(buf.as_mut_ptr() as *mut _)`

## Port byte-order note
`dwLocalPort` / `dwRemotePort` in `MIB_TCPROW_OWNER_PID` are 32-bit values with
the port in network byte order (big-endian) in the lower 16 bits.
Conversion: `u16::from_be(port as u16)` — swaps bytes on LE Windows.

## IP byte-order note
`dwLocalAddr` / `dwRemoteAddr` are stored such that `.to_le_bytes()` yields the
four octets in display order (e.g. 192.168.1.1 → [192, 168, 1, 1]).

## Gate results
| Check | Result |
|---|---|
| `cargo fmt` | PASS |
| `cargo clippy -- -D warnings` | PASS |
| `cargo check` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (205 kB JS) |

## Manual verification (user to run)
```powershell
npm run tauri dev
# Navigate to Network tab
# Should show live TCP connections with process names
# Cross-check: netstat -ano | findstr ESTABLISHED
```

## Tag pushed
`v0.1.0-beta` — release workflow running on GitHub Actions.

## Notes for Day B2 (Live polling)
- Add `start_connection_monitor` command that `tokio::spawn`s a loop, calling
  `enumerate_tcp_connections()` every N ms and emitting `connections-update` event
- Frontend: `listen('connections-update', ...)` updates Zustand `connectionStore`
- Store tracks stale connections (> 5s since last update) and drops them after 60s
- `System::new_all()` is called every poll — in B2 optimise to a persistent `System`
  that only calls `refresh_processes()` (much faster than `new_all()`)
- Poll interval driven by `settingsStore.pollIntervalMs` (default 2000ms)
