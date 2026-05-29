# Day A4 Status

## Workflows created

### check.yml — runs on every push to main + every PR
Steps in order:
1. `actions/checkout@v4`
2. `actions/setup-node@v4` (Node 20, npm cache)
3. `dtolnay/rust-toolchain@stable` with clippy + rustfmt components
4. `Swatinem/rust-cache@v2` (`./src-tauri -> target`) — keeps rebuild time <5 min
5. `npm ci`
6. `npx tsc --noEmit`
7. `cargo fmt --check` (working-directory: src-tauri)
8. `cargo clippy -- -D warnings` (working-directory: src-tauri)
9. `cargo check` (working-directory: src-tauri)

### release.yml — runs on `v*` tag push or manual dispatch
Steps: checkout → Node 20 → Rust stable → rust-cache → npm ci → tauri-action@v0
- Produces a **draft prerelease** on GitHub with the .msi and .exe attached
- Target: `x86_64-pc-windows-msvc`
- No code signing yet (Week E)

## Local gate before push
| Check | Result |
|---|---|
| `cargo fmt --check` | PASS |
| `cargo clippy -- -D warnings` | PASS |
| `cargo check` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (195 kB JS, 8.4 kB CSS) |

## Tag pushed
`v0.0.1-alpha` — triggers the release workflow.
**Check GitHub → Actions tab** for status (build takes 10–15 min on first run,
faster on subsequent with rust-cache warm).

## What to verify on GitHub
1. `Actions → Check` — should show green on the `8e67b4d` commit
2. `Actions → Release Shadow Scan` — running after v0.0.1-alpha tag push
3. `Releases` — draft release with `.msi` / `.exe` artefacts when build finishes
4. Download the `.exe`, install it — expect Windows SmartScreen warning (unsigned,
   normal for alpha). App should open and show system info.

## Notes for Day A5 (Sidebar + navigation + state stores)
- Install: `npm install lucide-react` (icons)
- Create `src/store/uiStore.ts` — Zustand store for current screen
- Create `src/store/settingsStore.ts` — persisted settings (poll interval, retention)
- Create `src/components/Sidebar.tsx` — 4-item nav (Network, Apple Relay, Audit, Settings)
- Create stub screens: NetworkScreen, AppleRelayScreen, AuditScreen, SettingsScreen
- Wire up in App.tsx with conditional rendering
- Settings screen shows real system info from Rust (reuses useSystemInfo hook)
