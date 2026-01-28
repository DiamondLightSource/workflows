//! Shared error type for authentication services.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};

/// Wrapper around `anyhow::Error` that implements `IntoResponse`.
#[derive(Debug)]
pub struct Error(pub anyhow::Error);

impl std::fmt::Display for Error {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl std::error::Error for Error {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        self.0.source()
    }
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        // Log the actual error for debugging
        tracing::error!(error = %self.0, "Request failed");
        
        // Return generic message to client (don't leak internal details)
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "An internal error occurred",
        )
            .into_response()
    }
}

impl From<anyhow::Error> for Error {
    fn from(err: anyhow::Error) -> Self {
        Self(err)
    }
}

// Implement From for common error types instead of blanket impl
impl From<std::io::Error> for Error {
    fn from(err: std::io::Error) -> Self {
        Self(err.into())
    }
}

impl From<sea_orm::DbErr> for Error {
    fn from(err: sea_orm::DbErr) -> Self {
        Self(err.into())
    }
}

impl From<serde_json::Error> for Error {
    fn from(err: serde_json::Error) -> Self {
        Self(err.into())
    }
}

impl From<serde_yaml::Error> for Error {
    fn from(err: serde_yaml::Error) -> Self {
        Self(err.into())
    }
}

impl From<openidconnect::url::ParseError> for Error {
    fn from(err: openidconnect::url::ParseError) -> Self {
        Self(err.into())
    }
}

impl From<std::string::FromUtf8Error> for Error {
    fn from(err: std::string::FromUtf8Error) -> Self {
        Self(err.into())
    }
}

impl From<base64::DecodeError> for Error {
    fn from(err: base64::DecodeError) -> Self {
        Self(err.into())
    }
}

impl From<axum::Error> for Error {
    fn from(err: axum::Error) -> Self {
        Self(anyhow::anyhow!("Axum error: {}", err))
    }
}
