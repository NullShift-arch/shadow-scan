# Day B3 Status

## What was built

### src-tauri/intel/endpoints.json (15 entries)
Bundled at compile time via `include_str!("../../intel/endpoints.json")`.
Entries cover:
| ID | Operator | Risk |
|---|---|---|
| apple-analytics | Apple Inc. | medium |
| apple-apns | Apple Inc. | low |
| apple-icloud | Apple Inc. | medium |
| ms-telemetry | Microsoft Corporation | medium |
| ms-update | Microsoft Corporation | low |
| google-analytics | Google LLC | **high** |
| google-services | Google LLC | low |
| cloudflare | Cloudflare Inc. | low |
| facebook-tracking | Meta Platforms Inc. | **high** |
| slack | Salesforce / Slack | low |
| discord | Discord Inc. | low |
| aws | Amazon.com Inc. | low |
| adobe-telemetry | Adobe Inc. | medium |
| spotify | Spotify AB | low |
| akamai | Akamai Technologies | low |

### src-tauri/src/intel/endpoints.rs
- `IntelEntry` struct (Serialize + Deserialize)
- `IntelDb` struct omits `version` field — serde ignores unknown JSON fields, no dead_code warning
- `OnceLock<Vec<IntelEntry>> INTEL` — parsed once on first call to `load()`
- `classify(hostname, remote_ip)` — checks domain patterns first, then IP ranges
- `pattern_match()` — fixed spec's bug: `*.apple.com` now correctly rejects `notapple.com`
  (uses `strip_suffix` + `ends_with('.')` check rather than naive `ends_with`)
- `ip_in_range()` — handles /8, /16, /24, /32 CIDR (sufficient for the database)

### monitors/connections.rs
- `remote_addr` extracted before struct literal to allow borrow by `classify()`
- `category`, `risk_level`, `plain_language` populated from intel entry if matched
- `remote_hostname` remains `None` — filled by reverse DNS in B4

### src/screens/NetworkScreen.tsx
- Risk badge: HIGH (red), MEDIUM (amber), LOW (teal) — border + background tinted
- `plain_language` shown as a second line in human-readable text
- Category + state shown in muted row below
- Classified count in subtitle ("N connections · M classified · live")

## Bug fix vs spec
The spec's `pattern_match` used `host.ends_with(stripped)` which incorrectly matches
`notapple.com` against `*.apple.com`. Fixed to:
```rust
host == suffix || host.strip_suffix(suffix).is_some_and(|p| p.ends_with('.'))
```

## Gate results
| Check | Result |
|---|---|
| `cargo fmt` | PASS |
| `cargo clippy -- -D warnings` | PASS |
| `cargo check` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (207 kB JS) |

## Manual verification (user to run)
```powershell
npm run tauri dev
# Network tab — Apple connections should show "sync" / "telemetry" categories
# Any 17.x.x.x connection → Apple APNS label, risk LOW
# Open Chrome → visit google.com → look for HIGH risk Google Analytics entries
# Unknown connections → no badge, no plain_language (correct fallback)
```

## Notes for Day B4 (Reverse DNS)
- Add `hickory-resolver = "0.24"` to Cargo.toml
- Background async task resolves `remote_addr` → hostname for each unique IP
- Cache results in `HashMap<String, Option<String>>` (IP → hostname)
- On resolution, emit `dns-resolved` event with `{ip, hostname}` payload
- Frontend updates connection store entry with `remote_hostname`
- `classify(Some(hostname), ip)` is then called → domain patterns fire
- This doubles classification hit rate (IP ranges → domain patterns)
