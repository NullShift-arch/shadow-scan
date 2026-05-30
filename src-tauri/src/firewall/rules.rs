use anyhow::anyhow;
use std::process::Command;

const RULE_PREFIX: &str = "tenfold-shadow-scan-block-";

fn rule_name(ip: &str) -> String {
    format!("{}{}", RULE_PREFIX, ip.replace('.', "-"))
}

fn validate_ip(ip: &str) -> anyhow::Result<()> {
    if ip.is_empty() || !ip.chars().all(|c| c.is_ascii_digit() || c == '.') {
        return Err(anyhow!("Invalid IP address: '{}'", ip));
    }
    Ok(())
}

/// Check whether a block rule for this IP already exists.
pub fn is_ip_blocked(ip: &str) -> anyhow::Result<bool> {
    validate_ip(ip)?;
    let name = rule_name(ip);

    let output = Command::new("netsh")
        .args([
            "advfirewall",
            "firewall",
            "show",
            "rule",
            &format!("name={name}"),
        ])
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    // netsh exits 0 and prints rule details when found;
    // exits non-zero and prints "No rules match" when absent.
    Ok(output.status.success() && !stdout.contains("No rules match"))
}

/// Create an outbound block rule for the given IP (idempotent).
pub fn block_ip(ip: &str) -> anyhow::Result<()> {
    validate_ip(ip)?;

    // Idempotent — silently succeed if rule already exists.
    if is_ip_blocked(ip)? {
        return Ok(());
    }

    let name = rule_name(ip);

    let output = Command::new("netsh")
        .args([
            "advfirewall",
            "firewall",
            "add",
            "rule",
            &format!("name={name}"),
            "dir=out",
            "action=block",
            &format!("remoteip={ip}"),
            "enable=yes",
        ])
        .output()?;

    if !output.status.success() {
        let out = String::from_utf8_lossy(&output.stdout);
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!(
            "netsh add rule failed: {} {}",
            out.trim(),
            err.trim()
        ));
    }

    Ok(())
}

/// Remove the outbound block rule for the given IP (idempotent).
pub fn unblock_ip(ip: &str) -> anyhow::Result<()> {
    validate_ip(ip)?;

    let name = rule_name(ip);

    let output = Command::new("netsh")
        .args([
            "advfirewall",
            "firewall",
            "delete",
            "rule",
            &format!("name={name}"),
        ])
        .output()?;

    if !output.status.success() {
        let out = String::from_utf8_lossy(&output.stdout);
        // "No rules match" means it was already absent — treat as success.
        if out.contains("No rules match") {
            return Ok(());
        }
        let err = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow!(
            "netsh delete rule failed: {} {}",
            out.trim(),
            err.trim()
        ));
    }

    Ok(())
}

/// List all IPs currently blocked by shadow-scan rules.
pub fn list_blocked_ips() -> anyhow::Result<Vec<String>> {
    let output = Command::new("netsh")
        .args([
            "advfirewall",
            "firewall",
            "show",
            "rule",
            &format!("name={RULE_PREFIX}*"),
        ])
        .output()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut ips = Vec::new();

    for line in stdout.lines() {
        let line = line.trim();
        if let Some(rest) = line.strip_prefix("Rule Name:") {
            let rule = rest.trim();
            if let Some(suffix) = rule.strip_prefix(RULE_PREFIX) {
                ips.push(suffix.replace('-', "."));
            }
        }
    }

    Ok(ips)
}
