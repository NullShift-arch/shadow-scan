use crate::error::AppError;
use serde::Serialize;
use sysinfo::System;

#[tauri::command]
pub async fn test_db_write() -> Result<i64, AppError> {
    let pool = crate::db::schema::get_pool();
    let now = chrono::Utc::now().timestamp_millis();
    let result = sqlx::query(
        "INSERT INTO audit_results (ts, score, findings) VALUES (?, ?, ?)",
    )
    .bind(now)
    .bind(85_i64)
    .bind(r#"{"test": true}"#)
    .execute(pool)
    .await?;
    Ok(result.last_insert_rowid())
}

#[derive(Serialize)]
pub struct SystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub host_name: String,
    pub cpu_count: usize,
    pub total_memory_gb: f64,
    pub uptime_seconds: u64,
}

#[tauri::command]
pub fn get_system_info() -> Result<SystemInfo, AppError> {
    let sys = System::new_all();
    Ok(SystemInfo {
        os_name: System::name().unwrap_or_else(|| "unknown".into()),
        os_version: System::os_version().unwrap_or_else(|| "unknown".into()),
        host_name: System::host_name().unwrap_or_else(|| "unknown".into()),
        cpu_count: sys.cpus().len(),
        total_memory_gb: (sys.total_memory() as f64) / 1_073_741_824.0,
        uptime_seconds: System::uptime(),
    })
}
