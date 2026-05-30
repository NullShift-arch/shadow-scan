use crate::audit::scoring::{self, AuditResult, Finding};
use crate::db::schema::get_pool;
use crate::error::AppError;
use crate::monitors::{connections, services};
use chrono::Utc;
use serde::{Deserialize, Serialize};

// ─── Audit commands ───────────────────────────────────────────────────────────

#[tauri::command]
pub async fn run_audit_cmd() -> Result<AuditResult, AppError> {
    let conns = connections::enumerate_tcp_connections().map_err(|e| AppError(e.to_string()))?;
    let svcs = services::enumerate_services().map_err(|e| AppError(e.to_string()))?;

    let result = scoring::run_audit(conns, svcs);

    let pool = get_pool();
    let findings_json =
        serde_json::to_string(&result.findings).map_err(|e| AppError(e.to_string()))?;

    sqlx::query("INSERT INTO audit_results (ts, score, findings) VALUES (?, ?, ?)")
        .bind(result.timestamp_ms)
        .bind(result.score as i32)
        .bind(&findings_json)
        .execute(pool)
        .await?;

    Ok(result)
}

#[tauri::command]
pub async fn get_audit_history(limit: i32) -> Result<Vec<AuditResult>, AppError> {
    let pool = get_pool();

    let rows = sqlx::query_as::<_, (i64, i32, String)>(
        "SELECT ts, score, findings FROM audit_results ORDER BY ts DESC LIMIT ?",
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;

    let results = rows
        .into_iter()
        .map(|(ts, score, findings_json)| {
            let findings: Vec<Finding> = serde_json::from_str(&findings_json).unwrap_or_default();
            let score_u32 = score.max(0) as u32;
            AuditResult {
                score: score_u32,
                risk_level: AuditResult::risk_level_for_score(score_u32),
                findings,
                timestamp_ms: ts,
            }
        })
        .collect();

    Ok(results)
}

// ─── Kill-switch log commands ─────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KillSwitchEntry {
    pub ts: i64,
    pub action: String,
    pub target_type: String,
    pub target_name: String,
    pub success: bool,
}

#[tauri::command]
pub async fn get_kill_switch_log(limit: i32) -> Result<Vec<KillSwitchEntry>, AppError> {
    let pool = get_pool();

    let rows = sqlx::query_as::<_, (i64, String, String, String, i32)>(
        "SELECT ts, action, target_type, target_name, success \
         FROM kill_switch_log ORDER BY ts DESC LIMIT ?",
    )
    .bind(limit)
    .fetch_all(pool)
    .await?;

    let entries = rows
        .into_iter()
        .map(
            |(ts, action, target_type, target_name, success)| KillSwitchEntry {
                ts,
                action,
                target_type,
                target_name,
                success: success != 0,
            },
        )
        .collect();

    Ok(entries)
}

/// Reverse all recorded block and disable actions:
/// - Unblocks every IP that was ever blocked via Shadow Scan.
/// - Re-enables every service that was ever disabled via Shadow Scan.
/// Uses idempotent underlying functions so it's safe to call multiple times.
#[tauri::command]
pub async fn restore_all_kills() -> Result<(), AppError> {
    let pool = get_pool();

    // Unblock every IP that Shadow Scan ever blocked.
    let blocked: Vec<(String,)> = sqlx::query_as(
        "SELECT DISTINCT target_name FROM kill_switch_log \
         WHERE action = 'block' AND target_type = 'ip' AND success = 1",
    )
    .fetch_all(pool)
    .await?;

    for (ip,) in &blocked {
        // Idempotent — already-unblocked IPs succeed silently.
        let _ = crate::firewall::rules::unblock_ip(ip);
    }

    // Re-enable every service that Shadow Scan ever disabled.
    let disabled: Vec<(String,)> = sqlx::query_as(
        "SELECT DISTINCT target_name FROM kill_switch_log \
         WHERE action = 'disable' AND target_type = 'service' AND success = 1",
    )
    .fetch_all(pool)
    .await?;

    for (svc,) in &disabled {
        let _ = crate::monitors::services::enable_service(svc);
    }

    // Log the restore event.
    let now = Utc::now().timestamp_millis();
    sqlx::query(
        "INSERT INTO kill_switch_log (ts, action, target_type, target_name, success) \
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(now)
    .bind("restore_all")
    .bind("system")
    .bind("all_blocks_and_disables")
    .bind(1i32)
    .execute(pool)
    .await?;

    Ok(())
}
