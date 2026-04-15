use axum::{
    body::Body,
    extract::{Request, State},
    middleware,
};
use http_body_util::BodyExt;
use std::sync::Arc;

use super::traits::{RetryPolicy, TokenInspector, TokenStore};
use crate::Result;
use crate::request::{clone_request, prepare_headers};

/// Core inject-token logic, usable by any caller that already has a store reference.
/// Use this when the store must be constructed per-request (e.g. BFF wrapping AppState + Session).
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
        Ok(next.run(req).await)
    }
}

/// Axum middleware that extracts `State<Arc<S>>` and delegates to [`inject_token_with`].
/// Use this when the store is shared application state (e.g. auth-daemon's RouterState).
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
