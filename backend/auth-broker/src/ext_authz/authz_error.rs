use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
};
use tracing::warn;

#[derive(Debug, thiserror::Error)]
pub enum AuthzError {
    #[error("missing service account token")]
    MissingToken,
    #[error("service account token not authenticated")]
    TokenNotAuthenticated,
    #[error("token review returned no username")]
    NoUsername,
    #[error("unexpected token username format: {0}")]
    UnexpectedUsernameFormat(String),
    #[error("token review missing pod name")]
    MissingPodName,
    #[error("pod not found: {0}")]
    PodNotFound(String),
    #[error("pod uid mismatch: token says {expected}, k8s reports {actual}")]
    PodUidMismatch { expected: String, actual: String },
    #[error("subject resolution failed: {0}")]
    SubjectResolution(String),
    #[error("token validation failed: {0}")]
    TokenValidation(String),
}

impl From<anyhow::Error> for AuthzError {
    fn from(e: anyhow::Error) -> Self {
        AuthzError::TokenValidation(e.to_string())
    }
}

impl From<auth_core::error::Error> for AuthzError {
    fn from(e: auth_core::error::Error) -> Self {
        AuthzError::TokenValidation(format!("{e:?}"))
    }
}

impl AuthzError {
    fn status_code(&self) -> StatusCode {
        match self {
            Self::TokenValidation(_) => StatusCode::SERVICE_UNAVAILABLE,
            _ => StatusCode::FORBIDDEN,
        }
    }
}

impl IntoResponse for AuthzError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let message = self.to_string();
        warn!("ext_authz: {message}");
        (status, message).into_response()
    }
}
