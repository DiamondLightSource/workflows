use std::sync::Arc;

use axum::{Json, extract::State, http::StatusCode, response::IntoResponse};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tracing::info;
use url::Url;

use crate::RouterState;

pub async fn proxy(
    State(router_state): State<Arc<RouterState>>,
    Json(query): Json<UserQuery>,
) -> Result<String, ProxyError> {
    let form = vec![
        ("grant_type", "refresh_token"),
        ("client_id", &router_state.client_id),
        ("refresh_token", &router_state.token),
    ];

    let auth_domain = match router_state.auth_domain.as_str().ends_with("/") {
        true => format!("{}protocol/openid-connect/token", router_state.auth_domain),
        false => format!("{}/protocol/openid-connect/token", router_state.auth_domain),
    };
    info!("Auth domain: {}", auth_domain);

    let client = Client::new();

    info!("Fetching access token");
    let res = client
        .post(auth_domain)
        .form(&form)
        .send()
        .await
        .map_err(|_err| ProxyError::AuthQuery(router_state.auth_domain.clone()))?;

    if !res.status().is_success() {
        let status = res.status();
        let body = res
            .text()
            .await
            .unwrap_or_else(|_| "No message".to_string());
        return Err(ProxyError::KeycloakError(status, body));
    }

    info!("Decoding access token");
    let auth_data: AuthResponse = res.json().await?;
    let graph_payload = GraphPayload::from(query.query);

    info!("Querying graph");
    let graph_request = client
        .post(router_state.graph_url.clone())
        .bearer_auth(auth_data.access_token)
        .json(&graph_payload)
        .send()
        .await?;

    info!("Decoding graph response");
    let graph_response: String = graph_request.text().await?;

    Ok(graph_response.to_string())
}

#[derive(Deserialize, Serialize)]
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
    #[error("Error on token exchange: status: {0}, message {1}")]
    KeycloakError(StatusCode, String),
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

#[cfg(test)]
mod tests {
    use std::{str::FromStr, sync::Arc};

    use axum::http::StatusCode;
    use mockito::Server;
    use url::Url;

    use crate::{
        RouterState,
        proxy::{ProxyError, UserQuery, proxy},
    };

    #[tokio::test]
    async fn base_test() {
        let client = "client";
        let token = "token";
        let port = 3000;

        let query = UserQuery {
            query: "test-query".into(),
        };
        let query_body = serde_json::to_string(&query).unwrap();

        let mut auth = Server::new_async().await;
        let mut graph = Server::new_async().await;

        auth.mock("POST", "/protocol/openid-connect/token")
            .with_status(200)
            .with_body(r#"{"access_token": "some-token"}"#)
            .create_async()
            .await;

        graph
            .mock("POST", "/")
            .with_status(200)
            .with_header("content-type", "application/json")
            .with_body(query_body)
            .create_async()
            .await;

        let router_state = RouterState {
            auth_domain: Url::from_str(&auth.url()).unwrap(),
            client_id: client.into(),
            graph_url: Url::from_str(&graph.url()).unwrap(),
            token: token.into(),
            port,
        };

        let resp = proxy(
            axum::extract::State(Arc::new(router_state)),
            axum::Json(query),
        )
        .await;
        assert!(resp.is_ok());
        let result = resp.unwrap();
        assert_eq!(r#"{"query":"test-query"}"#, result);
    }

    #[tokio::test]
    async fn invalid_auth() {
        let client = "client";
        let token = "token";
        let port = 3000;

        let query = UserQuery {
            query: "test-query".into(),
        };

        let mut auth = Server::new_async().await;

        auth.mock("POST", "/protocol/openid-connect/token")
            .with_status(401)
            .with_body("Unauthorized")
            .create_async()
            .await;

        let router_state = RouterState {
            auth_domain: Url::from_str(&auth.url()).unwrap(),
            client_id: client.into(),
            graph_url: Url::from_str("https://example.com").unwrap(),
            token: token.into(),
            port,
        };

        let resp = proxy(
            axum::extract::State(Arc::new(router_state)),
            axum::Json(query),
        )
        .await;
        assert!(resp.is_err());

        match resp {
            Err(ProxyError::KeycloakError(status, message)) => {
                assert_eq!(status, StatusCode::UNAUTHORIZED);
                assert_eq!(message, "Unauthorized");
            }
            other => panic!("Expected Unauthorized error, got {:?}", other),
        }
    }
}
