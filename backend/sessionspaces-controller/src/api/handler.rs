//! HTTP preparation handler coordinating metadata lookup and Kubernetes readiness.

use super::{
    AppState, lookup, prepare,
    types::{ApiError, PrepareRequest, PrepareResponse, SessionName},
};
use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
};
use std::time::Duration;

/// Validates the namespace, then resolves and prepares it within 120 seconds.
pub(super) async fn prepare(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<PrepareRequest>,
) -> Result<Json<PrepareResponse>, ApiError> {
    let name = SessionName::parse(&request.namespace)?;
    let token = bearer(&headers)?;
    if let Err(error) = state.authz.check_session_access(token, &name).await {
        tracing::info!(namespace = %name.namespace, "Session access check failed");
        return Err(error.into());
    }
    tracing::info!(namespace = %name.namespace, "Session access granted");
    tokio::time::timeout(Duration::from_secs(120), async {
        let spec = lookup::fetch(&state.database, &state.ldap_url, &name).await?;
        let generation =
            prepare::apply_and_wait(&state.sessionspaces, &name.namespace, &spec).await?;
        Ok(Json(PrepareResponse {
            namespace: name.namespace,
            generation,
            prepared: true,
        }))
    })
    .await
    .map_err(|_| {
        ApiError(
            StatusCode::GATEWAY_TIMEOUT,
            "Preparation timed out; the SessionSpace may still be reconciling",
        )
    })?
}

fn bearer(headers: &HeaderMap) -> Result<&str, ApiError> {
    let unauthorized = || ApiError(StatusCode::UNAUTHORIZED, "Missing bearer token");
    let value = headers
        .get(axum::http::header::AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(unauthorized)?;
    value
        .strip_prefix("Bearer ")
        .filter(|token| !token.is_empty())
        .ok_or_else(unauthorized)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_bearer_token() {
        let mut headers = HeaderMap::new();
        assert!(bearer(&headers).is_err());
        headers.insert(
            axum::http::header::AUTHORIZATION,
            "Basic dXNlcg==".parse().unwrap(),
        );
        assert!(bearer(&headers).is_err());
        headers.insert(
            axum::http::header::AUTHORIZATION,
            "Bearer token".parse().unwrap(),
        );
        assert_eq!(bearer(&headers).ok(), Some("token"));
    }
}
