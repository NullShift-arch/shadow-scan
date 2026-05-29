# Day A3 Status

## SQLite initialization
- **Pool pattern:** `static DB_POOL: OnceLock<SqlitePool>` in `db/schema.rs`
- **DB location:** `app.path().app_data_dir()` — on Windows resolves to:
  `C:\Users\IDOIT\AppData\Roaming\com.idoit.shadow-scan\shadow_scan.db`
- **WAL mode:** Set via individual PRAGMA statement (sqlx 0.7 SQLite doesn't
  execute multi-statement strings — each PRAGMA/CREATE/INDEX runs separately)

## Schema
Three tables created with `CREATE TABLE IF NOT EXISTS`:
- `connections_log` — pid, process, local/remote addr+port, protocol, state, category, risk
- `audit_results` — ts, score, findings (JSON blob)
- `kill_switch_log` — action, target_type, target_name, previous_state, success

Three indices: `idx_conn_ts`, `idx_audit_ts`, `idx_kill_ts` (all on `ts` column).

## Fix applied during A3
`app.path()` requires `use tauri::Manager;` in scope — added inside the setup
closure. Without this import, Tauri 2's `Manager` trait methods are not visible
on `&mut App`.

## Multi-statement PRAGMA note
The spec showed a single `sqlx::query(r#"PRAGMA ...; CREATE TABLE ...; ..."#)`.
This does NOT work with sqlx 0.7 SQLite — it only executes the first statement.
Each statement is now a separate `sqlx::query(...).execute(&pool).await?` call.

## Gate results
| Check | Result |
|---|---|
| `cargo fmt` | PASS |
| `cargo clippy -- -D warnings` | PASS |
| `cargo check` | PASS |
| `npx tsc --noEmit` | PASS |

## Manual verification (user to confirm)
Run `npm run tauri dev`, click "Test DB Write" — row IDs should increment (1, 2, 3…).
Then check:
```powershell
sqlite3 "$env:APPDATA\com.idoit.shadow-scan\shadow_scan.db" ".tables"
sqlite3 "$env:APPDATA\com.idoit.shadow-scan\shadow_scan.db" "SELECT name FROM sqlite_master WHERE type='index';"
sqlite3 "$env:APPDATA\com.idoit.shadow-scan\shadow_scan.db" "SELECT * FROM audit_results;"
```
Expected: three tables, three indices, rows with score=85.

## Notes for Day A4 (GitHub Actions CI/CD)
- `.github/workflows/check.yml` — runs on push to main: cargo fmt --check,
  cargo clippy, tsc, npm run build
- `.github/workflows/release.yml` — runs on `v*` tag: tauri-action produces
  unsigned .exe attached to a draft GitHub release
- MSVC env: runners use `windows-latest` which has VS Build Tools pre-installed,
  so no vcvarsall.bat sourcing needed in CI
- `Swatinem/rust-cache@v2` with `workspaces: './src-tauri -> target'` keeps
  compile times under 5 min after first run
