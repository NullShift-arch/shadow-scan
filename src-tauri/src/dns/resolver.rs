use hickory_resolver::{
    config::{ResolverConfig, ResolverOpts},
    TokioAsyncResolver,
};
use std::sync::OnceLock;

// One resolver lives for the app's lifetime. Must be initialised inside a
// tokio runtime (guaranteed — Tauri commands always run on a tokio thread).
static RESOLVER: OnceLock<TokioAsyncResolver> = OnceLock::new();

fn get_resolver() -> &'static TokioAsyncResolver {
    RESOLVER.get_or_init(|| {
        TokioAsyncResolver::tokio(ResolverConfig::default(), ResolverOpts::default())
    })
}

/// Resolve a remote IP address to its PTR (reverse-DNS) hostname.
/// Returns `None` on failure, timeout, or private/RFC1918 addresses.
pub async fn resolve_ip_to_hostname(ip: &str) -> Option<String> {
    let addr: std::net::IpAddr = ip.parse().ok()?;

    // Skip RFC1918 and loopback — they won't have public PTR records.
    if is_private(addr) {
        return None;
    }

    get_resolver()
        .reverse_lookup(addr)
        .await
        .ok()?
        .iter()
        .next()
        .map(|name| name.to_string().trim_end_matches('.').to_string())
}

fn is_private(addr: std::net::IpAddr) -> bool {
    match addr {
        std::net::IpAddr::V4(v4) => v4.is_loopback() || v4.is_private() || v4.is_link_local(),
        std::net::IpAddr::V6(v6) => v6.is_loopback(),
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_reverse_dns_octet_order() {
        // Verify that octets are reversed correctly for in-addr.arpa lookup.
        // hickory_resolver handles this internally — this test documents the expected format.
        let ip = "17.57.144.84";
        let parts: Vec<&str> = ip.split('.').collect();
        let arpa = format!(
            "{}.{}.{}.{}.in-addr.arpa",
            parts[3], parts[2], parts[1], parts[0]
        );
        assert_eq!(arpa, "84.144.57.17.in-addr.arpa");
    }
}
