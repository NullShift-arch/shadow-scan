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
