use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Connection {
    pub pid: u32,
    pub process_name: String,
    pub process_path: Option<String>,
    pub local_addr: String,
    pub local_port: u16,
    pub remote_addr: String,
    pub remote_port: u16,
    pub state: String,
    pub protocol: String,
    pub first_seen_ms: i64,
    pub last_seen_ms: i64,
    // Enrichment fields — populated in Days B3-B4
    pub remote_hostname: Option<String>,
    pub category: Option<String>,
    pub risk_level: Option<String>,
    pub plain_language: Option<String>,
}

/// Returns all active IPv4 TCP connections on this machine with process names.
pub fn enumerate_tcp_connections() -> anyhow::Result<Vec<Connection>> {
    #[cfg(windows)]
    {
        enumerate_windows()
    }
    #[cfg(not(windows))]
    {
        Ok(vec![])
    }
}

// ─── Windows implementation ──────────────────────────────────────────────────

// One System lives for the app's lifetime. refresh_processes() (~1-5 ms) is
// called each poll instead of System::new_all() (~50-100 ms).
#[cfg(windows)]
static SYSTEM: std::sync::OnceLock<std::sync::Mutex<sysinfo::System>> = std::sync::OnceLock::new();

#[cfg(windows)]
fn get_system() -> &'static std::sync::Mutex<sysinfo::System> {
    SYSTEM.get_or_init(|| std::sync::Mutex::new(sysinfo::System::new_all()))
}

#[cfg(windows)]
fn enumerate_windows() -> anyhow::Result<Vec<Connection>> {
    use windows::Win32::Foundation::BOOL;
    use windows::Win32::NetworkManagement::IpHelper::{
        GetExtendedTcpTable, MIB_TCPROW_OWNER_PID, MIB_TCPTABLE_OWNER_PID, TCP_TABLE_OWNER_PID_ALL,
    };

    // ── refresh process names ────────────────────────────────────────────────
    let sys_lock = get_system();
    let mut sys = sys_lock
        .lock()
        .expect("System mutex poisoned — a previous poll panicked");
    sys.refresh_processes();

    // ── enumerate TCP table ──────────────────────────────────────────────────
    let mut buf_len: u32 = 0;

    // First call: windows 0.56 takes Option<*mut c_void>; None = null (size probe).
    unsafe {
        GetExtendedTcpTable(
            None,
            &mut buf_len,
            BOOL(0),
            2, // AF_INET
            TCP_TABLE_OWNER_PID_ALL,
            0,
        );
    }

    if buf_len == 0 {
        return Ok(vec![]);
    }

    let mut buf = vec![0u8; buf_len as usize];

    let ret = unsafe {
        GetExtendedTcpTable(
            Some(buf.as_mut_ptr() as *mut _),
            &mut buf_len,
            BOOL(0),
            2, // AF_INET
            TCP_TABLE_OWNER_PID_ALL,
            0,
        )
    };

    if ret != 0 {
        anyhow::bail!("GetExtendedTcpTable failed with code {}", ret);
    }

    // SAFETY: buf is sized by the first call and correctly aligned for
    // MIB_TCPTABLE_OWNER_PID. table.table is a flexible C array; we access
    // elements 0..num_entries which all fall within the allocation.
    let table = unsafe { &*(buf.as_ptr() as *const MIB_TCPTABLE_OWNER_PID) };
    let num_entries = table.dwNumEntries as usize;
    let row_ptr = &table.table[0] as *const MIB_TCPROW_OWNER_PID;

    let now = chrono::Utc::now().timestamp_millis();
    let mut connections = Vec::with_capacity(num_entries);

    for i in 0..num_entries {
        let row = unsafe { &*row_ptr.add(i) };
        let pid = row.dwOwningPid;

        let (process_name, process_path) = sys
            .process(sysinfo::Pid::from(pid as usize))
            .map(|p| {
                let name = p.name().to_string();
                let path = p.exe().map(|e| e.to_string_lossy().into_owned());
                (name, path)
            })
            .unwrap_or_else(|| (format!("pid:{pid}"), None));

        connections.push(Connection {
            pid,
            process_name,
            process_path,
            local_addr: ip_from_u32(row.dwLocalAddr),
            local_port: port_from_u32(row.dwLocalPort),
            remote_addr: ip_from_u32(row.dwRemoteAddr),
            remote_port: port_from_u32(row.dwRemotePort),
            state: state_from_u32(row.dwState),
            protocol: "TCP".to_string(),
            first_seen_ms: now,
            last_seen_ms: now,
            remote_hostname: None,
            category: None,
            risk_level: None,
            plain_language: None,
        });
    }

    Ok(connections)
}

#[cfg(windows)]
fn ip_from_u32(addr: u32) -> String {
    let b = addr.to_le_bytes();
    format!("{}.{}.{}.{}", b[0], b[1], b[2], b[3])
}

#[cfg(windows)]
fn port_from_u32(port: u32) -> u16 {
    u16::from_be(port as u16)
}

#[cfg(windows)]
fn state_from_u32(state: u32) -> String {
    match state {
        1 => "CLOSED",
        2 => "LISTEN",
        3 => "SYN_SENT",
        4 => "SYN_RECEIVED",
        5 => "ESTABLISHED",
        6 => "FIN_WAIT1",
        7 => "FIN_WAIT2",
        8 => "CLOSE_WAIT",
        9 => "CLOSING",
        10 => "LAST_ACK",
        11 => "TIME_WAIT",
        12 => "DELETE_TCB",
        _ => "UNKNOWN",
    }
    .to_string()
}
