//! HTTP preparation handler coordinating metadata lookup and Kubernetes readiness.

use super::{
    AppState, lookup, prepare,
    types::{ApiError, PrepareRequest, PrepareResponse, SessionName},
};
use axum::{Json, extract::State, http::StatusCode};
use std::time::Duration;

/// Validates the namespace, then resolves and prepares it within 120 seconds.
pub(super) async fn prepare(
    State(state): State<AppState>,
    Json(request): Json<PrepareRequest>,
) -> Result<Json<PrepareResponse>, ApiError> {
    let name = SessionName::parse(&request.namespace)?;
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
