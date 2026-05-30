# Day C3 Status — Kill Switches Complete

## What was built

### monitors/services.rs — 4 control functions + 1 helper
**`open_scm_and_service(name, access)`** — shared helper: opens SCM with
`SC_MANAGER_CONNECT`, then opens the named service with the requested access
mask; closes SCM handle on error. Returns `(scm_handle, svc_handle)`.

**`stop_service(name)`** — calls `ControlService(svc, SERVICE_CONTROL_STOP, &mut status)`

**`start_service(name)`** — calls `StartServiceA(svc, None)` (no arguments)

**`disable_service(name)`** — calls `change_service_start_type(name, SERVICE_DISABLED)`

**`enable_service(name)`** — calls `change_service_start_type(name, SERVICE_AUTO_START)`

**`change_service_start_type(name, start_type)`** — shared helper for config changes:
calls `ChangeServiceConfigA` with `ENUM_SERVICE_TYPE(SERVICE_NO_CHANGE)` and
`SERVICE_ERROR(SERVICE_NO_CHANGE)` for all "no-change" parameters, and
`PCSTR::null()` for all string parameters.

All functions have no-op `#[cfg(not(windows))]` stubs.

### commands/services.rs — 4 kill switch Tauri commands
All follow the same pattern: call monitor function → log to `kill_switch_log`:
- `stop_service_cmd(service_name)` → action = "stop"
- `start_service_cmd(service_name)` → action = "start"
- `disable_service_cmd(service_name)` → action = "disable"
- `enable_service_cmd(service_name)` → action = "enable"

Shared `log_kill_switch(action, name)` helper writes to `kill_switch_log`:
columns: ts (epoch_ms), action, target_type="service", target_name, success=1

### hooks/useServiceControl.ts (new)
- `makeAction(command)` factory — wraps `invoke()` with loading/error state
- Returns `{ stop, start, disable, enable, loading, error, clearError }`
- Single hook instance per ServiceDetail row (state is local to each card)

### hooks/useServices.ts — refetch exported
- `refetch` is now a stable `useCallback` and returned alongside services/error/loading
- Enables AppleRelayScreen to re-fetch after kill-switch action

### components/ServiceDetail.tsx — kill switch buttons
- Stop button (red): shown when state === 'running'
- Start button (teal): shown when state === 'stopped'
- Disable button (amber): shown when startup_type !== 'Disabled'
- Enable button (teal): shown when startup_type === 'Disabled'
- `busy` state prevents double-clicks; buttons disabled during action
- Error banner appears below buttons when action fails
- `onActionComplete?.()` called on success → triggers parent refetch after 1 s

### screens/AppleRelayScreen.tsx
- Refresh button in header (right-aligned)
- `handleActionComplete` debounces refetch by 1 second (gives service time to transition)
- Passes `onActionComplete` to each ServiceDetail

## Gate results
| Check | Result |
|---|---|
| `cargo fmt` | ✓ |
| `cargo clippy -- -D warnings` | ✓ |
| `cargo check` | ✓ |
| `npx tsc --noEmit` | ✓ |
| `npm run build` | ✓ |

## Important note on UAC
Windows service stop/start/disable requires admin rights. If the app is NOT
running as admin, the Rust functions return `ACCESS_DENIED` which surfaces as
a red error banner in the ServiceDetail card. The error message from Windows
is descriptive ("Access is denied."). For the kill switches to work, the app
must be run as administrator (`npm run tauri dev` from an elevated PowerShell
prompt). UAC prompt on each API call is NOT how Windows works — the process
itself must be elevated.

## Manual verification (run as admin)
```powershell
# Run PowerShell as Administrator
cd C:\Users\IDOIT\shadow-scan
npm run tauri dev
# Click "Apple Relay"
# Find "Print Spooler" (safe test target)
# Click to expand → see "Stop" + "Disable" buttons
# Click "Stop" → 1 second delay → card shows STOPPED state
# Click "Start" → service restarts
# Verify in Services.msc that state matches
```

## Notes for Day C4 (Firewall Rules)
- `netsh advfirewall firewall add rule` can block IP addresses
- Command: `netsh advfirewall firewall add rule name="shadow-scan-block-{ip}" dir=out action=block remoteip={ip}`
- Each connection's expanded row should get a "Block IP" button
- Log to `kill_switch_log` with target_type="firewall" and target_name=ip
- Use `std::process::Command` to run netsh (needs elevation same as services)
