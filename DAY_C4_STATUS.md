# Day C4 Status — Firewall Rule Integration Complete

## What was built

### firewall/rules.rs (new module)
- `rule_name(ip)` — derives `tenfold-shadow-scan-block-{IP-with-dashes}` from IP
- `validate_ip(ip)` — rejects strings that aren't ASCII digits + dots
- `is_ip_blocked(ip)` — calls `netsh show rule name={rule_name}` and checks exit code
- `block_ip(ip)` — idempotent: checks first, then `netsh add rule dir=out action=block remoteip={ip}`
- `unblock_ip(ip)` — idempotent: `netsh delete rule name={rule_name}`; treats "No rules match" as success
- `list_blocked_ips()` — bonus: parses `netsh show rule name=tenfold-shadow-scan-block-*` to list all blocked IPs

All use `std::process::Command` (no Win32 API) — simpler, no additional unsafe code.

### commands/firewall.rs (new)
- `block_ip_cmd(ip)` — calls `rules::block_ip`, logs to `kill_switch_log` (action="block", target_type="ip")
- `unblock_ip_cmd(ip)` — calls `rules::unblock_ip`, logs action="unblock"
- `is_ip_blocked_cmd(ip)` — sync read, no logging
- `list_blocked_ips_cmd()` — returns Vec<String> of blocked IPs

### hooks/useFirewallControl.ts (new)
- Per-IP hook: `useFirewallControl(ip: string)`
- Checks block state on mount via `invoke('is_ip_blocked_cmd', { ip })`
- `block()` / `unblock()` update state optimistically after command succeeds
- Exposes `{ isBlocked, block, unblock, loading, error }`

### components/ServiceDetail.tsx — ConnectionBlockRow
- Extracted `ConnectionBlockRow` sub-component (one per connection) that calls
  `useFirewallControl` at component top level — avoids React hooks-in-loops violation
- Block button: red "Block" → calls `block()` → changes to amber "Unblock"
- Unblock button: amber "Unblock" → calls `unblock()` → changes back to red "Block"
- Loading state: shows "…" while netsh runs (~50-100 ms)

## Rule naming convention
`tenfold-shadow-scan-block-{IP}` with dots replaced by dashes:
- `1.2.3.4` → `tenfold-shadow-scan-block-1-2-3-4`

Verify via PowerShell:
```powershell
netsh advfirewall firewall show rule name="tenfold-shadow-scan-block-*"
```

## Gate results
| Check | Result |
|---|---|
| `cargo fmt` | ✓ |
| `cargo clippy -- -D warnings` | ✓ |
| `cargo check` | ✓ |
| `npx tsc --noEmit` | ✓ |
| `npm run build` | ✓ |

## Spec deviation (React Rules of Hooks)
The spec called `useFirewallControl()` inside a `.map()` callback, which violates
React's Rules of Hooks (hooks can't be called in loops). Fixed by extracting
`ConnectionBlockRow` — a proper React component — so the hook is called at
component top level, one instance per connection row.

## Week C summary
| Day | Feature | Status |
|---|---|---|
| C1 | Windows Service enumeration (SCM API) | ✅ |
| C2 | Service-to-connection correlation, hierarchical UI | ✅ |
| C3 | Kill switches: stop/start/disable/enable services | ✅ |
| C4 | Firewall IP blocking via netsh | ✅ |

## Manual verification (run as admin)
```powershell
# Start from elevated PowerShell
cd C:\Users\IDOIT\shadow-scan
npm run tauri dev
# Click Apple Relay → expand any service with connections
# Per-connection row shows "Block" button (red)
# Click "Block" → button changes to amber "Unblock"
# Verify rule created:
netsh advfirewall firewall show rule name="tenfold*"
# Click "Unblock" → button returns to "Block"
# Rule removed from Windows Firewall
```

## Notes for Day C5 (Polish + Rule Management Panel)
- Add "Blocked IPs" panel calling `list_blocked_ips_cmd()`
- Show all tenfold-* rules with bulk unblock option
- Add disclaimer banner about blocking wrong IPs breaking connectivity
- Consider adding IP ranges (CIDR) to the block function for ISP-level blocking
- `netsh advfirewall firewall add rule remoteip=1.2.3.0/24` works for CIDR
