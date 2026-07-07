use axum::{
    body::Body,
    extract::{Request, State},
    http::StatusCode,
    middleware,
    response::IntoResponse,
};
use http_body_util::BodyExt;
use std::sync::Arc;

use super::traits::{RetryPolicy, TokenInspector, TokenStore};
use crate::Result;
use crate::request::{clone_request, prepare_headers};

/// Injects a token into the request, refreshing it if expired, and retries on auth failure.
/// Use this when the store cannot be expressed as a single `Arc<S>` in axum `State` — for
/// example, when it must be assembled per-request from multiple sources such as shared app
/// state and a per-request session (as in auth-gateway's `GatewayTokenContext`).
pub async fn inject_token_with<S>(
    store: &S,
    req: Request,
    next: middleware::Next,
) -> Result<axum::response::Response>
where
    S: TokenStore + RetryPolicy,
{
    let token = store.load_token().await;
    if let Some(mut token) = token {
        if token.is_expired() {
            token = store.refresh_and_persist(&token).await?;
        }

        let (mut primary_req, mut retry_req) = clone_request(req).await?;

        if let Some(bearer) = token.bearer_value() {
            prepare_headers(&mut primary_req, &bearer);
        }

        let response = next.clone().run(primary_req).await;

        let (response_parts, response_body) = response.into_parts();
        let response_bytes = response_body
            .collect()
            .await
            .map_err(|e| anyhow::anyhow!("collect body error: {e}"))?
            .to_bytes();

        if store.should_retry(response_parts.status, &response_bytes) {
            token = store.refresh_and_persist(&token).await?;
            if let Some(bearer) = token.bearer_value() {
                prepare_headers(&mut retry_req, &bearer);
            }
            Ok(next.run(retry_req).await)
        } else {
            Ok(axum::response::Response::from_parts(
                response_parts,
                Body::from(response_bytes),
            ))
        }
    } else {
        Ok(StatusCode::UNAUTHORIZED.into_response())
    }
}

/// Axum middleware that extracts `State<Arc<S>>` and delegates to [`inject_token_with`].
/// Use this when the store is self-contained in the router state — for example, auth-daemon's
/// `RouterState`, which holds everything needed to load and refresh tokens without per-request
/// context.
pub async fn inject_token<S>(
    State(store): State<Arc<S>>,
    req: Request,
    next: middleware::Next,
) -> Result<axum::response::Response>
where
    S: TokenStore + RetryPolicy + 'static,
{
    inject_token_with(store.as_ref(), req, next).await
}
