use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Service {
    pub name: String,
    pub display_name: String,
    pub state: ServiceState,
    pub startup_type: StartupType,
    pub pid: Option<u32>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ServiceState {
    Running,
    Stopped,
    Paused,
    Continuing,
    Starting,
    Stopping,
    Pausing,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub enum StartupType {
    Boot,
    System,
    Auto,
    Demand,
    Disabled,
}

impl ServiceState {
    pub fn from_u32(state: u32) -> Self {
        match state {
            0x01 => ServiceState::Stopped,
            0x02 => ServiceState::Starting,
            0x03 => ServiceState::Stopping,
            0x04 => ServiceState::Running,
            0x05 => ServiceState::Continuing,
            0x06 => ServiceState::Pausing,
            _ => ServiceState::Stopped,
        }
    }
}

impl StartupType {
    pub fn from_u32(start_type: u32) -> Self {
        match start_type {
            0x00 => StartupType::Boot,
            0x01 => StartupType::System,
            0x02 => StartupType::Auto,
            0x03 => StartupType::Demand,
            0x04 => StartupType::Disabled,
            _ => StartupType::Disabled,
        }
    }
}

#[cfg(windows)]
pub fn enumerate_services() -> anyhow::Result<Vec<Service>> {
    use std::ffi::CStr;
    use windows::Win32::System::Services::{
        CloseServiceHandle, EnumServicesStatusExA, OpenSCManagerA, ENUM_SERVICE_STATUS_PROCESSA,
        SC_ENUM_PROCESS_INFO, SERVICE_QUERY_CONFIG, SERVICE_STATE_ALL, SERVICE_WIN32,
    };

    let scm = unsafe { OpenSCManagerA(None, None, SERVICE_QUERY_CONFIG)? };

    // First call: probe buffer size
    let mut buf_size = 0u32;
    let mut service_count = 0u32;

    unsafe {
        let _ = EnumServicesStatusExA(
            scm,
            SC_ENUM_PROCESS_INFO,
            SERVICE_WIN32,
            SERVICE_STATE_ALL,
            None,
            &mut buf_size,
            &mut service_count,
            None,
            None,
        );
    }

    if buf_size == 0 {
        let _ = unsafe { CloseServiceHandle(scm) };
        return Ok(vec![]);
    }

    // Second call: enumerate with buffer
    let mut buf = vec![0u8; buf_size as usize];
    let mut service_count = 0u32;

    unsafe {
        EnumServicesStatusExA(
            scm,
            SC_ENUM_PROCESS_INFO,
            SERVICE_WIN32,
            SERVICE_STATE_ALL,
            Some(&mut buf),
            &mut buf_size,
            &mut service_count,
            None,
            None,
        )?;
    }

    let mut services = Vec::new();
    let base_ptr = buf.as_ptr() as *const ENUM_SERVICE_STATUS_PROCESSA;

    for i in 0..service_count as usize {
        let svc_status = unsafe { &*base_ptr.add(i) };

        let name = unsafe {
            CStr::from_ptr(svc_status.lpServiceName.0.cast::<i8>())
                .to_string_lossy()
                .to_string()
        };

        let display_name = unsafe {
            CStr::from_ptr(svc_status.lpDisplayName.0.cast::<i8>())
                .to_string_lossy()
                .to_string()
        };

        let state = ServiceState::from_u32(svc_status.ServiceStatusProcess.dwCurrentState.0);
        let startup_type = StartupType::from_u32(svc_status.ServiceStatusProcess.dwServiceType.0);
        let pid = if svc_status.ServiceStatusProcess.dwProcessId > 0 {
            Some(svc_status.ServiceStatusProcess.dwProcessId)
        } else {
            None
        };

        services.push(Service {
            name,
            display_name,
            state,
            startup_type,
            pid,
            description: None,
        });
    }

    let _ = unsafe { CloseServiceHandle(scm) };
    Ok(services)
}

#[cfg(not(windows))]
pub fn enumerate_services() -> anyhow::Result<Vec<Service>> {
    Ok(vec![])
}

// ─── Service control (Windows only) ─────────────────────────────────────────

#[cfg(windows)]
fn open_scm_and_service(
    service_name: &str,
    access: u32,
) -> anyhow::Result<(
    windows::Win32::Security::SC_HANDLE,
    windows::Win32::Security::SC_HANDLE,
)> {
    use std::ffi::CString;
    use windows::core::PCSTR;
    use windows::Win32::System::Services::{OpenSCManagerA, OpenServiceA, SC_MANAGER_CONNECT};

    let name = CString::new(service_name)?;
    unsafe {
        let scm = OpenSCManagerA(None, None, SC_MANAGER_CONNECT)
            .map_err(|e| anyhow::anyhow!("OpenSCManagerA failed: {e}"))?;
        let svc = OpenServiceA(scm, PCSTR(name.as_ptr() as *const u8), access).map_err(|e| {
            let _ = windows::Win32::System::Services::CloseServiceHandle(scm);
            anyhow::anyhow!("OpenServiceA('{}') failed: {e}", service_name)
        })?;
        Ok((scm, svc))
    }
}

#[cfg(windows)]
pub fn stop_service(service_name: &str) -> anyhow::Result<()> {
    use windows::Win32::System::Services::{
        CloseServiceHandle, ControlService, SERVICE_CONTROL_STOP, SERVICE_STATUS, SERVICE_STOP,
    };

    let (scm, svc) = open_scm_and_service(service_name, SERVICE_STOP)?;

    let result = unsafe {
        let mut status: SERVICE_STATUS = std::mem::zeroed();
        ControlService(svc, SERVICE_CONTROL_STOP, &mut status)
            .map_err(|e| anyhow::anyhow!("ControlService(stop '{}') failed: {e}", service_name))
    };

    unsafe {
        let _ = CloseServiceHandle(svc);
        let _ = CloseServiceHandle(scm);
    }
    result
}

#[cfg(windows)]
pub fn start_service(service_name: &str) -> anyhow::Result<()> {
    use windows::Win32::System::Services::{CloseServiceHandle, StartServiceA, SERVICE_START};

    let (scm, svc) = open_scm_and_service(service_name, SERVICE_START)?;

    let result = unsafe {
        StartServiceA(svc, None)
            .map_err(|e| anyhow::anyhow!("StartServiceA('{}') failed: {e}", service_name))
    };

    unsafe {
        let _ = CloseServiceHandle(svc);
        let _ = CloseServiceHandle(scm);
    }
    result
}

#[cfg(windows)]
pub fn disable_service(service_name: &str) -> anyhow::Result<()> {
    use windows::Win32::System::Services::SERVICE_DISABLED;
    change_service_start_type(service_name, SERVICE_DISABLED)
}

#[cfg(windows)]
pub fn enable_service(service_name: &str) -> anyhow::Result<()> {
    use windows::Win32::System::Services::SERVICE_AUTO_START;
    change_service_start_type(service_name, SERVICE_AUTO_START)
}

#[cfg(windows)]
fn change_service_start_type(
    service_name: &str,
    start_type: windows::Win32::System::Services::SERVICE_START_TYPE,
) -> anyhow::Result<()> {
    use windows::core::PCSTR;
    use windows::Win32::System::Services::{
        ChangeServiceConfigA, CloseServiceHandle, SERVICE_CHANGE_CONFIG, SERVICE_NO_CHANGE,
    };

    let (scm, svc) = open_scm_and_service(service_name, SERVICE_CHANGE_CONFIG)?;

    use windows::Win32::System::Services::{ENUM_SERVICE_TYPE, SERVICE_ERROR};
    let result = unsafe {
        ChangeServiceConfigA(
            svc,
            ENUM_SERVICE_TYPE(SERVICE_NO_CHANGE), // dwServiceType — no change
            start_type,
            SERVICE_ERROR(SERVICE_NO_CHANGE), // dwErrorControl — no change
            PCSTR::null(),                    // lpBinaryPathName — no change
            PCSTR::null(),                    // lpLoadOrderGroup — no change
            None,                             // lpdwTagId — no change
            PCSTR::null(),                    // lpDependencies — no change
            PCSTR::null(),                    // lpServiceStartName — no change
            PCSTR::null(),                    // lpPassword — no change
            PCSTR::null(),                    // lpDisplayName — no change
        )
        .map_err(|e| anyhow::anyhow!("ChangeServiceConfigA('{}') failed: {e}", service_name))
    };

    unsafe {
        let _ = CloseServiceHandle(svc);
        let _ = CloseServiceHandle(scm);
    }
    result
}

#[cfg(not(windows))]
pub fn stop_service(_: &str) -> anyhow::Result<()> {
    Ok(())
}
#[cfg(not(windows))]
pub fn start_service(_: &str) -> anyhow::Result<()> {
    Ok(())
}
#[cfg(not(windows))]
pub fn disable_service(_: &str) -> anyhow::Result<()> {
    Ok(())
}
#[cfg(not(windows))]
pub fn enable_service(_: &str) -> anyhow::Result<()> {
    Ok(())
}
