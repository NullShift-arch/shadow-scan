# Day A2 Status

## Task 1 — Crate name
Package name: `shadow-scan`. Lib crate: `shadow_scan_lib` (Tauri 2 convention, declared in `[lib]` section of Cargo.toml).

## Command registration location
`main.rs` — uses `tauri::Builder::default()` directly (not the mobile-ready `lib.rs run()` pattern). Command registered as:
```rust
.invoke_handler(tauri::generate_handler![
    shadow_scan_lib::commands::system::get_system_info,
])
```

## sysinfo API
Version 0.30 API matches the Day A2 spec exactly:
- `System::name()`, `System::os_version()`, `System::host_name()`, `System::uptime()` — associated functions
- `sys.cpus().len()`, `sys.total_memory()` — instance methods
No adaptation required.

## Scaffold greet command
Removed. `lib.rs` contains only `pub mod commands; pub mod error;`. No greet function anywhere.

## Gate results
| Check | Result |
|---|---|
| `cargo fmt` | PASS |
| `cargo clippy -- -D warnings` | PASS |
| `cargo check` | PASS |
| `npx tsc --noEmit` | PASS |

## Notes for Day A3 (SQLite)
- All deps already in Cargo.toml: `sqlx = { version = "0.7", features = ["sqlite", "runtime-tokio-rustls", "chrono"] }`
- Use `query()` string method pattern, not `query!` macro (no DATABASE_URL set)
- DB file will live in `app.path().app_data_dir()` — typically `C:\Users\IDOIT\AppData\Roaming\com.idoit.shadow-scan\`
- `OnceLock<SqlitePool>` pattern for the global pool
- Three tables: `connections_log`, `audit_results`, `kill_switch_log`
- WAL mode + foreign keys via PRAGMA on init
