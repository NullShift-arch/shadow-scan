use crate::error::AppError;
use crate::monitors::connections::{enumerate_tcp_connections, Connection};

#[tauri::command]
pub fn get_connections() -> Result<Vec<Connection>, AppError> {
    enumerate_tcp_connections().map_err(AppError::from)
}
