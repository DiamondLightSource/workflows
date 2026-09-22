//! Session access check against the Diamond AuthZ (OPA) `session/access` policy.
//!
//! The policy answers whether the caller behind `token` may use a visit:
//! matching the deployment (staging tokens are rejected by production OPA and
//! vice versa, they use different signing keys).

use super::types::{ApiError, SessionName};
use axum::http::StatusCode;
use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Failure of the access check: denial by policy or an unavailable backend.
/// Denials and outages both fail closed, with distinct status codes.
#[derive(Debug)]
pub(super) enum AuthzError {
    Invalid,
    Denied,
    Unavailable,
}

impl From<AuthzError> for ApiError {
    fn from(error: AuthzError) -> Self {
        match error {
            AuthzError::Invalid => Self(
                StatusCode::BAD_REQUEST,
                "Invalid session identifier for authorization",
            ),
            AuthzError::Denied => Self(
                StatusCode::FORBIDDEN,
                // Deliberately opaque: the policy returns false both when the
                // session does not exist and when the caller lacks access
                "Caller is not authorized for this session, or the session does not exist",
            ),
            AuthzError::Unavailable => Self(
                StatusCode::BAD_GATEWAY,
                "Session authorization check unavailable",
            ),
        }
    }
}

#[derive(Serialize)]
struct OpaInput {
    token: String,
    proposal: u32,
    instrument_session: u32,
}

#[derive(Serialize)]
struct OpaRequest {
    input: OpaInput,
}

#[derive(Deserialize)]
struct OpaResponse {
    result: bool,
}

#[derive(Clone)]
pub(super) struct OpaClient {
    client: reqwest::Client,
    url: String,
}

impl OpaClient {
    pub(super) fn new(base_url: &str, timeout: Duration) -> Result<Self, reqwest::Error> {
        Ok(Self {
            client: reqwest::Client::builder().timeout(timeout).build()?,
            url: format!(
                "{}/v1/data/diamond/session/access",
                base_url.trim_end_matches('/')
            ),
        })
    }

    /// DLS proposal numbers are globally unique so instrument name is optional.
    pub(super) async fn check_session_access(
        &self,
        token: &str,
        name: &SessionName,
    ) -> Result<(), AuthzError> {
        let proposal = name
            .number
            .parse::<u32>()
            .map_err(|_| AuthzError::Invalid)?;
        let session = u32::try_from(name.visit).map_err(|_| AuthzError::Invalid)?;
        let response = self
            .client
            .post(&self.url)
            .json(&OpaRequest {
                input: OpaInput {
                    token: token.to_string(),
                    proposal,
                    instrument_session: session,
                },
            })
            .send()
            .await
            .map_err(|_| AuthzError::Unavailable)?;
        if !response.status().is_success() {
            return Err(AuthzError::Unavailable);
        }
        response
            .json::<OpaResponse>()
            .await
            .map_err(|_| AuthzError::Unavailable)
            .and_then(|body| {
                if body.result {
                    Ok(())
                } else {
                    Err(AuthzError::Denied)
                }
            })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{Json, Router, extract::State, routing::post};
    use serde_json::{Value, json};
    use std::sync::{
        Arc,
        atomic::{AtomicU32, Ordering},
    };

    async fn mock_opa(status: StatusCode, result: bool) -> (String, Arc<AtomicU32>) {
        type MockState = (Arc<AtomicU32>, StatusCode, bool);

        async fn handler(
            State((seen, status, result)): State<MockState>,
            Json(body): Json<Value>,
        ) -> (StatusCode, Json<Value>) {
            let proposal = body["input"]["proposal"].as_u64().unwrap_or_default() as u32;
            seen.store(proposal, Ordering::SeqCst);
            (status, Json(json!({"result": result})))
        }

        let seen = Arc::new(AtomicU32::new(u32::MAX));
        let app = Router::new()
            .route("/v1/data/diamond/session/access", post(handler))
            .with_state((seen.clone(), status, result));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        (format!("http://{address}"), seen)
    }

    fn name() -> SessionName {
        SessionName::parse("mg36964-1").unwrap()
    }

    fn client(base_url: &str) -> OpaClient {
        OpaClient::new(base_url, Duration::from_secs(5)).unwrap()
    }

    #[tokio::test]
    async fn allows_and_maps_namespace_to_opa_input() {
        let (url, seen) = mock_opa(StatusCode::OK, true).await;
        client(&url)
            .check_session_access("token", &name())
            .await
            .unwrap();
        assert_eq!(
            seen.load(Ordering::SeqCst),
            36964,
            "proposal number must reach OPA"
        );
    }

    #[tokio::test]
    async fn denies_without_touching_anything_else() {
        let (url, _) = mock_opa(StatusCode::OK, false).await;
        let allowed = client(&url).check_session_access("token", &name()).await;
        assert!(matches!(allowed, Err(AuthzError::Denied)));
    }

    #[tokio::test]
    async fn treats_policy_outage_as_unavailable() {
        let (url, _) = mock_opa(StatusCode::INTERNAL_SERVER_ERROR, false).await;
        let allowed = client(&url).check_session_access("token", &name()).await;
        assert!(matches!(allowed, Err(AuthzError::Unavailable)));
    }

    #[tokio::test]
    async fn maps_authz_errors_to_http_statuses() {
        let invalid: ApiError = AuthzError::Invalid.into();
        assert_eq!(invalid.0, StatusCode::BAD_REQUEST);
        let denied: ApiError = AuthzError::Denied.into();
        assert_eq!(denied.0, StatusCode::FORBIDDEN);
        let down: ApiError = AuthzError::Unavailable.into();
        assert_eq!(down.0, StatusCode::BAD_GATEWAY);
    }
}
