use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::path::Path;
use std::sync::OnceLock;

static DB_POOL: OnceLock<SqlitePool> = OnceLock::new();

pub async fn init_database(app_dir: &Path) -> anyhow::Result<()> {
    std::fs::create_dir_all(app_dir)?;
    let db_path = app_dir.join("shadow_scan.db");
    let db_url = format!("sqlite://{}?mode=rwc", db_path.display());

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect(&db_url)
        .await?;

    // sqlx 0.7 SQLite doesn't execute multi-statement strings — run each separately.
    sqlx::query("PRAGMA journal_mode = WAL")
        .execute(&pool)
        .await?;
    sqlx::query("PRAGMA foreign_keys = ON")
        .execute(&pool)
        .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS connections_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            ts          INTEGER NOT NULL,
            pid         INTEGER,
            process     TEXT,
            local_addr  TEXT,
            local_port  INTEGER,
            remote_addr TEXT,
            remote_port INTEGER,
            protocol    TEXT,
            state       TEXT,
            category    TEXT,
            risk        TEXT
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS audit_results (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            ts       INTEGER NOT NULL,
            score    INTEGER NOT NULL,
            findings TEXT NOT NULL
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        "CREATE TABLE IF NOT EXISTS kill_switch_log (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            ts             INTEGER NOT NULL,
            action         TEXT NOT NULL,
            target_type    TEXT NOT NULL,
            target_name    TEXT NOT NULL,
            previous_state TEXT,
            success        INTEGER NOT NULL
        )",
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_conn_ts  ON connections_log(ts)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_results(ts)")
        .execute(&pool)
        .await?;
    sqlx::query("CREATE INDEX IF NOT EXISTS idx_kill_ts  ON kill_switch_log(ts)")
        .execute(&pool)
        .await?;

    DB_POOL
        .set(pool)
        .map_err(|_| anyhow::anyhow!("DB already initialized"))?;
    Ok(())
}

pub fn get_pool() -> &'static SqlitePool {
    DB_POOL.get().expect("Database not initialized")
}
