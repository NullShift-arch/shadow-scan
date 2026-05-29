use std::time::Duration;

use chrono::Utc;
use tauri::{AppHandle, Emitter};

use crate::db::schema::get_pool;
use crate::dns::resolver;
use crate::error::AppError;
use crate::intel::endpoints;
use crate::monitors::connections::{enumerate_tcp_connections, Connection};

#[tauri::command]
pub fn get_connections() -> Result<Vec<Connection>, AppError> {
    enumerate_tcp_connections().map_err(AppError::from)
}

/// Spawns a background tokio task that emits "connections-update" events at
/// the requested interval. Fire-and-forget: runs until the app exits.
#[tauri::command]
pub async fn start_connection_monitor(app: AppHandle, interval_ms: u64) -> Result<(), AppError> {
    tokio::spawn(async move {
        let mut interval = tokio::time::interval(Duration::from_millis(interval_ms));
        loop {
            interval.tick().await;
            match enumerate_tcp_connections() {
                Ok(conns) => {
                    let _ = app.emit("connections-update", conns);
                }
                Err(e) => {
                    eprintln!("Connection monitor error: {e}");
                }
            }
        }
    });
    Ok(())
}

/// Resolve a single IP address to its PTR hostname via async DNS.
#[tauri::command]
pub async fn resolve_hostname(ip: String) -> Result<Option<String>, AppError> {
    Ok(resolver::resolve_ip_to_hostname(&ip).await)
}

/// Placeholder for a future background DNS enrichment task.
#[tauri::command]
pub async fn start_dns_enrichment() -> Result<(), AppError> {
    Ok(())
}

/// Second-pass classification using a resolved hostname.
/// Returns (category, risk, plain_language) if matched, None otherwise.
/// Called by the frontend after DNS resolution to upgrade IP-only matches to
/// domain-pattern matches.
#[tauri::command]
pub fn re_classify_connection(
    hostname: Option<String>,
    remote_ip: String,
) -> Result<Option<(String, String, String)>, AppError> {
    match endpoints::classify_with_hostname(hostname.as_deref(), &remote_ip) {
        Some(entry) => Ok(Some((
            entry.category.clone(),
            entry.risk.clone(),
            entry.plain_language.clone(),
        ))),
        None => Ok(None),
    }
}

/// Archive a connection snapshot to the connections_log SQLite table.
/// Registered but not yet called by the frontend — called in Week C.
#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub async fn archive_connection(
    pid: u32,
    process_name: String,
    local_addr: String,
    local_port: u16,
    remote_addr: String,
    remote_port: u16,
    protocol: String,
    state: String,
    category: Option<String>,
    risk: Option<String>,
) -> Result<(), AppError> {
    let pool = get_pool();
    let now = Utc::now().timestamp_millis();

    sqlx::query(
        r#"INSERT INTO connections_log
           (ts, pid, process, local_addr, local_port, remote_addr, remote_port, protocol, state, category, risk)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"#,
    )
    .bind(now)
    .bind(pid as i64)
    .bind(process_name)
    .bind(local_addr)
    .bind(local_port as i64)
    .bind(remote_addr)
    .bind(remote_port as i64)
    .bind(protocol)
    .bind(state)
    .bind(category)
    .bind(risk)
    .execute(pool)
    .await?;

    Ok(())
}
