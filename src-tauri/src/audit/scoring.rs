use crate::monitors::{
    connections::Connection,
    services::{Service, ServiceState, StartupType},
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditResult {
    pub score: u32,
    pub risk_level: String,
    pub findings: Vec<Finding>,
    pub timestamp_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Finding {
    pub category: String,
    pub severity: String,
    pub title: String,
    pub description: String,
    pub impact_points: i32,
}

impl AuditResult {
    pub fn risk_level_for_score(score: u32) -> String {
        match score {
            0..=20 => "Safe",
            21..=40 => "Low",
            41..=60 => "Medium",
            61..=80 => "High",
            _ => "Critical",
        }
        .to_string()
    }
}

pub fn run_audit(connections: Vec<Connection>, services: Vec<Service>) -> AuditResult {
    let mut findings = Vec::new();
    let mut score: i32 = 0;
    let now = chrono::Utc::now().timestamp_millis();

    // RULE 1: Active telemetry/tracking connections (+5 per connection)
    let tracking: Vec<&Connection> = connections
        .iter()
        .filter(|c| matches!(c.category.as_deref(), Some("telemetry") | Some("tracking")))
        .collect();

    if !tracking.is_empty() {
        let count = tracking.len();
        let impact = (count as i32) * 5;
        score += impact;

        findings.push(Finding {
            category: "telemetry".to_string(),
            severity: "high".to_string(),
            title: format!(
                "{} active tracking/telemetry connection{}",
                count,
                if count != 1 { "s" } else { "" }
            ),
            description: format!(
                "{} connection{} detected to known telemetry and ad tracking services. {}",
                count,
                if count != 1 { "s" } else { "" },
                if count > 5 {
                    "Consider blocking these IPs via Shadow Scan's firewall integration."
                } else {
                    "You may want to investigate these connections."
                }
            ),
            impact_points: impact,
        });
    }

    // RULE 2: Known Windows diagnostic/telemetry services running (+8 each)
    let suspicious_names = ["DiagTrack", "dmwappushservice", "WerSvc", "SSDPSRV"];
    let running_suspicious: Vec<&Service> = services
        .iter()
        .filter(|s| {
            matches!(s.state, ServiceState::Running) && suspicious_names.contains(&s.name.as_str())
        })
        .collect();

    if !running_suspicious.is_empty() {
        let count = running_suspicious.len();
        let impact = (count as i32) * 8;
        score += impact;

        findings.push(Finding {
            category: "service".to_string(),
            severity: "high".to_string(),
            title: format!(
                "{} diagnostic/telemetry service{} running",
                count,
                if count != 1 { "s" } else { "" }
            ),
            description: "These services collect diagnostics data and send it to Microsoft. \
                          Stop them via the Services tab to reduce exposure."
                .to_string(),
            impact_points: impact,
        });
    }

    // RULE 3: Services with >10 active connections (+3 each)
    let running_services: Vec<&Service> = services
        .iter()
        .filter(|s| matches!(s.state, ServiceState::Running))
        .collect();

    for svc in &running_services {
        if let Some(pid) = svc.pid {
            let conn_count = connections.iter().filter(|c| c.pid == pid).count();
            if conn_count > 10 {
                let impact = 3;
                score += impact;
                findings.push(Finding {
                    category: "service".to_string(),
                    severity: "medium".to_string(),
                    title: format!("{} has {} active connections", svc.display_name, conn_count),
                    description: format!(
                        "{} is maintaining {} network connections. \
                         This may be legitimate (browser, mail client) or indicate unusual activity.",
                        svc.display_name, conn_count
                    ),
                    impact_points: impact,
                });
            }
        }
    }

    // RULE 4: IPv6 connections detected (+2)
    let ipv6_count = connections
        .iter()
        .filter(|c| c.remote_addr.contains(':'))
        .count();
    if ipv6_count > 0 {
        let impact = 2;
        score += impact;
        findings.push(Finding {
            category: "network".to_string(),
            severity: "low".to_string(),
            title: format!(
                "{} IPv6 connection{} detected",
                ipv6_count,
                if ipv6_count != 1 { "s" } else { "" }
            ),
            description: "IPv6 traffic is harder to classify and block with simple rules. \
                          Monitor these connections closely."
                .to_string(),
            impact_points: impact,
        });
    }

    // RULE 5: High-risk connections (+10 each)
    let high_risk: Vec<&Connection> = connections
        .iter()
        .filter(|c| c.risk_level.as_deref() == Some("high"))
        .collect();

    if !high_risk.is_empty() {
        let count = high_risk.len();
        let impact = (count as i32) * 10;
        score += impact;
        findings.push(Finding {
            category: "tracking".to_string(),
            severity: "critical".to_string(),
            title: format!("{} HIGH-risk connection{} active", count, if count != 1 { "s" } else { "" }),
            description: format!(
                "{} connection{} to known high-risk endpoints (ad networks, tracking infrastructure). \
                 Use the Block button in the Services tab to deny these IPs.",
                count,
                if count != 1 { "s" } else { "" }
            ),
            impact_points: impact,
        });
    }

    // RULE 6: Protective — Update/Defender disabled reduces score (-10 each)
    let protectively_disabled: Vec<&Service> = services
        .iter()
        .filter(|s| {
            matches!(s.startup_type, StartupType::Disabled)
                && (s.name.contains("Update")
                    || s.name.contains("Telemetry")
                    || s.name == "DiagTrack")
        })
        .collect();

    for svc in protectively_disabled {
        let impact = -10;
        score += impact;
        findings.push(Finding {
            category: "service".to_string(),
            severity: "low".to_string(),
            title: format!("{} is disabled", svc.display_name),
            description: format!(
                "{} is disabled. This reduces telemetry exposure.",
                svc.display_name
            ),
            impact_points: impact,
        });
    }

    // Clamp 0–100
    let clamped = score.clamp(0, 100) as u32;

    AuditResult {
        score: clamped,
        risk_level: AuditResult::risk_level_for_score(clamped),
        findings,
        timestamp_ms: now,
    }
}
