use chrono::Utc;

use crate::db::schema::get_pool;
use crate::error::AppError;
use crate::monitors::services::Service;

#[tauri::command]
pub fn get_services() -> Result<Vec<Service>, AppError> {
    #[cfg(windows)]
    {
        crate::monitors::services::enumerate_services().map_err(AppError::from)
    }
    #[cfg(not(windows))]
    {
        Ok(vec![])
    }
}

async fn log_kill_switch(action: &str, service_name: &str) -> Result<(), AppError> {
    let pool = get_pool();
    let now = Utc::now().timestamp_millis();
    sqlx::query(
        r#"INSERT INTO kill_switch_log (ts, action, target_type, target_name, success)
           VALUES (?, ?, ?, ?, ?)"#,
    )
    .bind(now)
    .bind(action)
    .bind("service")
    .bind(service_name)
    .bind(1i32)
    .execute(pool)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn stop_service_cmd(service_name: String) -> Result<(), AppError> {
    crate::monitors::services::stop_service(&service_name).map_err(AppError::from)?;
    log_kill_switch("stop", &service_name).await
}

#[tauri::command]
pub async fn start_service_cmd(service_name: String) -> Result<(), AppError> {
    crate::monitors::services::start_service(&service_name).map_err(AppError::from)?;
    log_kill_switch("start", &service_name).await
}

#[tauri::command]
pub async fn disable_service_cmd(service_name: String) -> Result<(), AppError> {
    crate::monitors::services::disable_service(&service_name).map_err(AppError::from)?;
    log_kill_switch("disable", &service_name).await
}

#[tauri::command]
pub async fn enable_service_cmd(service_name: String) -> Result<(), AppError> {
    crate::monitors::services::enable_service(&service_name).map_err(AppError::from)?;
    log_kill_switch("enable", &service_name).await
}
