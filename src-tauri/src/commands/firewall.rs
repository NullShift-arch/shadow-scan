use chrono::Utc;

use crate::db::schema::get_pool;
use crate::error::AppError;
use crate::firewall::rules;

async fn log_firewall(action: &str, ip: &str) -> Result<(), AppError> {
    let pool = get_pool();
    let now = Utc::now().timestamp_millis();
    sqlx::query(
        r#"INSERT INTO kill_switch_log (ts, action, target_type, target_name, success)
           VALUES (?, ?, ?, ?, ?)"#,
    )
    .bind(now)
    .bind(action)
    .bind("ip")
    .bind(ip)
    .bind(1i32)
    .execute(pool)
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn block_ip_cmd(ip: String) -> Result<(), AppError> {
    rules::block_ip(&ip).map_err(AppError::from)?;
    log_firewall("block", &ip).await
}

#[tauri::command]
pub async fn unblock_ip_cmd(ip: String) -> Result<(), AppError> {
    rules::unblock_ip(&ip).map_err(AppError::from)?;
    log_firewall("unblock", &ip).await
}

#[tauri::command]
pub fn is_ip_blocked_cmd(ip: String) -> Result<bool, AppError> {
    rules::is_ip_blocked(&ip).map_err(AppError::from)
}

#[tauri::command]
pub fn list_blocked_ips_cmd() -> Result<Vec<String>, AppError> {
    rules::list_blocked_ips().map_err(AppError::from)
}
