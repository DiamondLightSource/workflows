use std::sync::Arc;

use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::debug;
use url::Url;

use crate::RouterState;

#[axum::debug_handler]
pub async fn proxy(
    State(router_state): State<Arc<RouterState>>,
    Json(query): Json<UserQuery>,
) -> Result<String, ProxyError> {
    let form = vec![
        ("grant_type", "refresh_token"),
        ("client_id", &router_state.client_id),
        ("refresh_token", &router_state.token),
    ];

    let auth_domain = format!("{}/protocol/openid-connect/token", router_state.auth_domain);

    let client = Client::new();

    debug!("Fetching access token");
    let res = client
        .post(auth_domain)
        .form(&form)
        .send()
        .await
        .map_err(|_err| ProxyError::AuthQuery(router_state.auth_domain.clone()))?;

    debug!("Decoding access token");
    let auth_data: AuthResponse = res.json().await?;
    let graph_payload = GraphPayload::from(query.query);

    debug!("Querying graph");
    let graph_request = client
        .post(router_state.graph_url.clone())
        .bearer_auth(auth_data.access_token)
        .json(&graph_payload)
        .send()
        .await?;

    debug!("Decoding graph response");
    let graph_response: String = graph_request.text().await?;

    Ok(graph_response.to_string())
}

#[derive(Deserialize)]
pub struct UserQuery {
    query: String,
}

#[derive(Deserialize)]
struct AuthResponse {
    access_token: String,
}

#[derive(Serialize)]
struct GraphPayload {
    query: String,
}

impl From<String> for GraphPayload {
    fn from(value: String) -> Self {
        GraphPayload { query: value }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum ProxyError {
    #[error("Could not reach auth service at {0}")]
    AuthQuery(Url),
    #[error("Could not deserialise response: {0}")]
    Deserialization(#[from] reqwest::Error),
}

impl IntoResponse for ProxyError {
    fn into_response(self) -> axum::response::Response {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            format!("Something went wrong: {}", self),
        )
            .into_response()
    }
}
