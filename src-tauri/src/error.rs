#[derive(Debug, thiserror::Error, serde::Serialize)]
#[error("{0}")]
pub struct AppError(pub String);

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        Self(e.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        Self(e.to_string())
    }
}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        Self(e.to_string())
    }
}

impl From<String> for AppError {
    fn from(s: String) -> Self {
        Self(s)
    }
}
