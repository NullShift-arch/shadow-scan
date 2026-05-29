# Day B4 Status

## What was built

### hickory-resolver 0.24
Added to `Cargo.toml` with `tokio-runtime` feature:
```toml
hickory-resolver = { version = "0.24", features = ["tokio-runtime"] }
```

### src-tauri/src/dns/resolver.rs
- `static RESOLVER: OnceLock<TokioAsyncResolver>` — one resolver for the app's lifetime
- `get_resolver()` — initialises with `ResolverConfig::default()` (OS-configured DNS)
- `resolve_ip_to_hostname(ip)` — async PTR lookup via `resolver.reverse_lookup(addr)`
- `is_private()` — skips RFC1918 / loopback IPs that have no public PTR records
- `TokioAsyncResolver::tokio()` called within tokio context (guaranteed by Tauri)

### API deviation vs spec
The spec used manual in-addr.arpa construction + `lookup(query, RecordType::PTR)`.
I used `resolver.reverse_lookup(addr: IpAddr)` which:
1. Handles octet reversal and `.in-addr.arpa` construction internally
2. Returns `ReverseLookup` with a typed iterator over `Name`s
3. Is the idiomatic hickory-resolver API for this use case
4. Eliminates the parse-error-prone manual string construction

### commands/network.rs — two new commands
- `resolve_hostname(ip: String)` — calls `resolver::resolve_ip_to_hostname` asynchronously
- `start_dns_enrichment()` — clean placeholder (returns `Ok(())`); real Rust-side
  enrichment loop deferred to B5

### src/hooks/useDnsEnrichment.ts
- Reads connections via `useConnectionStore.getState()` (imperative) — NOT as a
  reactive dependency. This prevents the interval from being reset every 2 seconds
  when the `connections` Map reference changes (which would cause the 5s timer to
  never fire).
- Resolves up to 5 unresolved IPs per 5-second batch
- Updates `remote_hostname` in the connection store via `setState`
- DNS failures are silently ignored (hostname stays `None`)

### src/screens/NetworkScreen.tsx
- `remote_hostname` displayed between plain_language and the IP:port row
- Uses `text-[11px]` monospace so it reads as a technical subheading

## Gate results
| Check | Result |
|---|---|
| `cargo fmt` | PASS |
| `cargo clippy -- -D warnings` | PASS |
| `cargo check` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS (208 kB JS) |

## Hook dependency bug in the spec — fixed
The spec's `useDnsEnrichment` hook had `[connections]` in the dependency array.
Since `connections` is a `Map` (new reference every 2 seconds due to B2 polling),
the `setInterval(5000)` would be destroyed and recreated every 2 seconds,
meaning the 5-second timer would never complete. Fixed by reading store state
imperatively with `getState()` and using an empty dependency array.

## Notes for Day B5 (Polish + Sorting/Filtering + sqlite logging)
- Re-run `classify(Some(hostname), ip)` after DNS resolution populates hostname
  → domain patterns will fire → more connections get service names
- This requires either a second Rust command `reclassify(ip, hostname) -> ClassificationResult`
  or a TypeScript port of the classification logic
- Add sorting controls: by risk (high first), by process name, by category
- Add filter pills: All / Telemetry / Tracking / Sync / Unknown
- Archive connections to `connections_log` SQLite table (rolling 30-day window)
- v0.3.0-beta will be the first full Network Sentinel release

## Manual verification (user to run)
```powershell
npm run tauri dev
# Open Network tab — connections load with IP-based classification immediately
# Wait 5-30 seconds — hostnames appear for public IPs (Apple, Google, MS)
# Any 17.x.x.x connection should resolve to *.apple.com, *.icloud.com, etc.
# RFC1918 IPs (192.168.x.x, 10.x.x.x) show no hostname (correctly skipped)
```
