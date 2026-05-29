# Day A5 Status

## What was built

### Stores
- `src/store/uiStore.ts` — ephemeral screen-selection state (resets on restart, by design)
- `src/store/settingsStore.ts` — persisted settings via `zustand/middleware/persist` + localStorage
  - Keys: `pollIntervalMs` (default 2000), `retentionDays` (default 30), `showDevTools`, `hasAcceptedDisclaimer`
  - Storage key: `shadow-scan-settings` in localStorage

### Components
- `src/components/Sidebar.tsx` — fixed-width (w-56) left nav, 4 items, active item highlighted in tf-teal
  - Icons from `lucide-react@1.17.0`: Activity, Apple, Shield, Settings

### Screens
| File | Status |
|---|---|
| `NetworkScreen.tsx` | Stub — "Coming soon" |
| `AppleRelayScreen.tsx` | Stub — "Coming soon" |
| `AuditScreen.tsx` | Stub — "Coming soon" |
| `SettingsScreen.tsx` | **Real** — dropdowns for poll interval + retention, dev tools toggle, live system info from Rust |

### App.tsx
Replaced with layout: `flex h-screen` root with `Sidebar` + `<main>` containing conditional screen render.

## Gate results
| Check | Result |
|---|---|
| `npx tsc --noEmit` | PASS |
| `cargo fmt` | PASS |
| `cargo clippy -- -D warnings` | PASS |
| `npm run build` | PASS (203 kB JS, 10 kB CSS) |

## Releases
- `v0.0.2-alpha` tag pushed — release workflow running on GitHub Actions
- If the `contents: write` fix from the v0.0.1-alpha retry holds, this build will
  produce a draft `.msi` + `.exe` in GitHub Releases

## Manual verification (user to run)
```powershell
npm run tauri dev
```
Verify:
1. Sidebar with SHADOW SCAN header and 4 nav buttons renders on left
2. Clicking Network / Apple Relay / Audit → stub "Coming soon" screens
3. Clicking Settings → real screen with dropdowns and system info
4. Change poll interval dropdown → close app → reopen → setting persists
5. Dev tools checkbox state persists across restarts

## Week A complete
All foundation scaffolding is in place:
- Tauri v2 shell compiling and launching
- Rust → Frontend IPC proven
- SQLite initialized with schema on startup
- GitHub Actions CI (check.yml) green on every push
- GitHub Actions release (release.yml) producing .exe on tag
- Navigation and persistent settings working

## Week B begins at Day B1
**TCP connection enumeration** — the first real feature. Uses `windows-rs` crate
(`Win32_NetworkManagement_IpHelper`) to enumerate all active TCP connections,
map PIDs to process names via `sysinfo`, and expose them as a Tauri command.
This is the most Rust-heavy day in the project — budget extra time.
