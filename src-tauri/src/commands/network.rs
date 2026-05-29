use std::time::Duration;

use tauri::{AppHandle, Emitter};

use crate::error::AppError;
use crate::monitors::connections::{enumerate_tcp_connections, Connection};

#[tauri::command]
pub fn get_connections() -> Result<Vec<Connection>, AppError> {
    enumerate_tcp_connections().map_err(AppError::from)
}

/// Spawns a background tokio task that emits "connections-update" events at
/// the requested interval. Fire-and-forget: the task runs until the app exits.
/// Calling this multiple times (e.g. when the poll interval changes) spawns an
/// additional task; extra events are harmless — the store deduplicates by key.
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
