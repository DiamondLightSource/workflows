//! Preparation payloads, HTTP errors and validated proposal/visit identifiers.

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use serde_json::json;

/// Namespace-only input whose metadata is resolved by the API.
#[derive(Deserialize)]
pub(super) struct PrepareRequest {
    pub namespace: String,
}

/// Successful preparation result identifying the namespace and ready generation.
#[derive(Serialize)]
pub(super) struct PrepareResponse {
    pub namespace: String,
    pub generation: i64,
    pub prepared: bool,
}

/// HTTP status and client-facing message, serialized as a JSON error response.
#[derive(Debug)]
pub(super) struct ApiError(pub StatusCode, pub &'static str);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(json!({"error": self.1}))).into_response()
    }
}

impl From<anyhow::Error> for ApiError {
    fn from(error: anyhow::Error) -> Self {
        tracing::warn!(error = %format!("{error:#}"), "SessionSpace preparation failed");
        Self(
            StatusCode::BAD_GATEWAY,
            "Session metadata lookup or Kubernetes operation failed",
        )
    }
}

/// Lowercase session namespace split into proposal and visit lookup components.
pub(super) struct SessionName {
    pub namespace: String,
    pub proposal: String,
    pub code: String,
    pub number: String,
    pub visit: i32,
}

impl SessionName {
    /// Lowercases and validates a namespace such as `mx12345-1`, rejecting leading-zero numbers.
    pub fn parse(name: &str) -> Result<Self, ApiError> {
        let name = name.to_ascii_lowercase();
        let invalid = || {
            ApiError(
                StatusCode::BAD_REQUEST,
                "Expected namespace like (proposal code)(proposal number)-(visit number)",
            )
        };
        let (proposal, visit) = name.split_once('-').ok_or_else(invalid)?;
        let split = proposal
            .find(|c: char| c.is_ascii_digit())
            .ok_or_else(invalid)?;
        let (code, number) = proposal.split_at(split);
        if name.len() > 63
            || code.is_empty()
            || !code.bytes().all(|c| c.is_ascii_lowercase())
            || !number.bytes().all(|c| c.is_ascii_digit())
            || number.starts_with('0')
            || visit.is_empty()
            || !visit.bytes().all(|c| c.is_ascii_digit())
            || visit.starts_with('0')
        {
            return Err(invalid());
        }
        let visit = visit.parse::<i32>().map_err(|_| invalid())?;
        Ok(Self {
            namespace: name.clone(),
            proposal: proposal.into(),
            code: code.into(),
            number: number.into(),
            visit,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validates_namespace_before_queries() {
        let name = SessionName::parse("mx12345-1").ok().unwrap();
        assert_eq!(
            (name.code.as_str(), name.number.as_str(), name.visit),
            ("mx", "12345", 1)
        );
        assert_eq!(
            SessionName::parse("AU34221-3").unwrap().namespace,
            "au34221-3"
        );
        for invalid in [
            "",
            "mx12345",
            "mx12345-0",
            "mx0123-1",
            "mx123-01",
            "mx123-1)(cn=*)",
            "mx123-2147483648",
        ] {
            assert!(SessionName::parse(invalid).is_err(), "{invalid}");
        }
    }
}
