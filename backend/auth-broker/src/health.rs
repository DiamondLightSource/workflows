use std::sync::Arc;

use axum::{extract::State, http::StatusCode, response::IntoResponse};
use tracing::warn;

use crate::state::AuthBrokerState;

pub async fn health_check(State(state): State<Arc<AuthBrokerState>>) -> impl IntoResponse {
    match state.check_database().await {
        Ok(()) => StatusCode::OK,
        Err(e) => {
            warn!("health check failed: {e:?}");
            StatusCode::SERVICE_UNAVAILABLE
        }
    }
}
