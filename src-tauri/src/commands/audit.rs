use crate::audit::scoring::{self, AuditResult, Finding};
use crate::db::schema::get_pool;
use crate::error::AppError;
use crate::monitors::{connections, services};

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
