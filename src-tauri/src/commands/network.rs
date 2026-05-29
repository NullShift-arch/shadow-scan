use std::time::Duration;

use tauri::{AppHandle, Emitter};

use crate::dns::resolver;
use crate::error::AppError;
use crate::monitors::connections::{enumerate_tcp_connections, Connection};

#[tauri::command]
pub fn get_connections() -> Result<Vec<Connection>, AppError> {
    enumerate_tcp_connections().map_err(AppError::from)
}

/// Spawns a background tokio task that emits "connections-update" events at
/// the requested interval. Fire-and-forget: the task runs until the app exits.
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
/// Called by the frontend useDnsEnrichment hook on batches of unresolved IPs.
#[tauri::command]
pub async fn resolve_hostname(ip: String) -> Result<Option<String>, AppError> {
    Ok(resolver::resolve_ip_to_hostname(&ip).await)
}

/// Placeholder for a future background DNS enrichment task.
/// The real enrichment loop lives in the frontend useDnsEnrichment hook for B4.
/// B5 will migrate this to a Rust-side event emitter.
#[tauri::command]
pub async fn start_dns_enrichment() -> Result<(), AppError> {
    Ok(())
}
