use serde::{Deserialize, Serialize};
use std::sync::OnceLock;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IntelEntry {
    pub id: String,
    pub domain_patterns: Vec<String>,
    pub ip_ranges: Vec<String>,
    pub category: String,
    pub subcategory: String,
    pub service_name: String,
    pub operator: String,
    pub risk: String,
    pub plain_language: String,
    pub block_impact: Option<String>,
    #[serde(default)]
    pub references: Vec<String>,
}

// version field is omitted — serde silently ignores unknown JSON fields.
#[derive(Debug, Deserialize)]
struct IntelDb {
    pub entries: Vec<IntelEntry>,
}

static INTEL: OnceLock<Vec<IntelEntry>> = OnceLock::new();

/// Returns the loaded intel database, parsing the bundled JSON once.
pub fn load() -> &'static Vec<IntelEntry> {
    INTEL.get_or_init(|| {
        let raw = include_str!("../../intel/endpoints.json");
        let db: IntelDb = serde_json::from_str(raw).expect("endpoints.json is invalid JSON");
        db.entries
    })
}

/// Classify a connection by hostname (if known) then by remote IP.
/// Second-pass classifier used after DNS resolution.
/// Prioritises domain-pattern matching across all entries before falling back
/// to the combined domain+IP scan in `classify()`.
pub fn classify_with_hostname(
    hostname: Option<&str>,
    remote_ip: &str,
) -> Option<&'static IntelEntry> {
    if let Some(host) = hostname {
        let entries = load();
        for entry in entries {
            for pat in &entry.domain_patterns {
                if pattern_match(pat, host) {
                    return Some(entry);
                }
            }
        }
    }
    // No domain match (or no hostname) — fall back to IP-range matching.
    classify(hostname, remote_ip)
}

/// Returns the first matching entry, or None for unknown endpoints.
pub fn classify(hostname: Option<&str>, remote_ip: &str) -> Option<&'static IntelEntry> {
    let entries = load();

    for entry in entries {
        if let Some(host) = hostname {
            for pat in &entry.domain_patterns {
                if pattern_match(pat, host) {
                    return Some(entry);
                }
            }
        }

        for range in &entry.ip_ranges {
            if ip_in_range(remote_ip, range) {
                return Some(entry);
            }
        }
    }

    None
}

/// Glob-style wildcard matching.
/// `*.apple.com` matches `apple.com` and `sub.apple.com` but not `notapple.com`.
fn pattern_match(pattern: &str, host: &str) -> bool {
    if let Some(suffix) = pattern.strip_prefix("*.") {
        // Exact match (apple.com) OR subdomain match (sub.apple.com).
        host == suffix || host.strip_suffix(suffix).is_some_and(|p| p.ends_with('.'))
    } else {
        host == pattern
    }
}

/// Simplified CIDR range check — handles /8, /16, /24, /32 only.
/// Full bitwise CIDR math is unnecessary for our database size.
fn ip_in_range(ip: &str, range: &str) -> bool {
    let Some((prefix, mask_str)) = range.split_once('/') else {
        return range == ip;
    };

    let mask: u32 = mask_str.parse().unwrap_or(32);
    let pp: Vec<&str> = prefix.split('.').collect();
    let ip: Vec<&str> = ip.split('.').collect();

    if pp.len() != 4 || ip.len() != 4 {
        return false;
    }

    match mask {
        8 => pp[0] == ip[0],
        16 => pp[0] == ip[0] && pp[1] == ip[1],
        24 => pp[0] == ip[0] && pp[1] == ip[1] && pp[2] == ip[2],
        32 => pp[0] == ip[0] && pp[1] == ip[1] && pp[2] == ip[2] && pp[3] == ip[3],
        _ => false,
    }
}
