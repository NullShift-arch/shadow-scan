# Day C1 Status — Windows Service Enumeration Complete

## What was built

### monitors/services.rs
- **Service struct**: Serializable with display_name, state, startup_type, pid, description
- **Enums**: ServiceState (running/stopped/paused/etc), StartupType (Boot/System/Auto/Demand/Disabled)
- **enumerate_services()**: Uses Windows SCM API via `OpenSCManagerA` + `EnumServicesStatusExA`
  - Two-call pattern: size probe (buf_size=0), then real enumeration with buffer
  - Returns Vec<Service> with all running and stopped services (~100+ on typical Windows)
  - Safe pointer handling: `PSTR.0.cast::<i8>()` for C strings, newtypes with `.0` for enum fields

### commands/services.rs
- `get_services()` command: Invokes `enumerate_services()`, returns JSON array of services
- Conditional: #[cfg(windows)] returns real data, non-Windows returns empty vec

### Wiring
- modules/mod.rs: declared `pub mod services`
- commands/mod.rs: declared `pub mod services`
- main.rs: registered `get_services` in invoke_handler

### hooks/useServices.ts
- `useServices()` hook: Calls `invoke('get_services')` on mount
- Returns: `{ services, error, loading }`
- Service interface matches Rust struct exactly

### screens/AppleRelayScreen.tsx
- Rewritten from "Coming soon" to full service list
- Shows: display_name, internal name (service name), state, startup_type, PID
- Color coding:
  - State: running (teal), stopped (grey), paused (amber)
  - Startup: Auto (teal), Demand (grey), Disabled (red), System (amber), Boot (red)
- Count header: "N running · M total"

## Gate results
| Check | Result |
|---|---|
| `cargo fmt` | ✓ |
| `cargo clippy -- -D warnings` | ✓ |
| `cargo check` | ✓ |
| `npx tsc --noEmit` | ✓ |

## Commits
- `Day C1: Windows Service enumeration via SCM API`
- Tag: v0.3.2-beta (release build)

## Manual verification (user can run)
```powershell
npm run tauri dev
# Click "Apple Relay" in sidebar
# See list of services (50-100+)
# Find "Windows Update" (display name) / wuauserv (service name)
# Should show as "running" if Windows Update is active
# Verify PID for running services (can cross-check with Get-Process)
```

## Notes for Day C2 (Service-to-Connection Correlation)
- This enumeration is a snapshot (not live like connections)
- For service correlation: map service PID to connection PIDs
- Create a new "Apple Relay" UI section showing which services own which connections
- Example: "Windows Update [wuauserv, PID 1024] → connections to microsoft.com"
