use std::sync::Arc;
use axum::{
    body::Body,
    extract::{Request, State},
    middleware,
    response::IntoResponse,
};
use http_body_util::BodyExt;

use crate::Result;
use crate::request::{clone_request, prepare_headers};
use super::traits::{TokenStore, TokenInspector, RetryPolicy};

pub async fn inject_token<S>(
    State(store): State<Arc<S>>,
    req: Request,
    next: middleware::Next,
) -> Result<impl IntoResponse>
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
        let response_bytes = response_body.collect().await
            .map_err(|e| anyhow::anyhow!("collect body error: {e}"))?
            .to_bytes();

        if store.should_retry(response_parts.status, &response_bytes) {
            token = store.refresh_and_persist(&token).await?;
            if let Some(bearer) = token.bearer_value() {
                prepare_headers(&mut retry_req, &bearer);
            }
            Ok(next.run(retry_req).await)
        } else {
            Ok(axum::response::Response::from_parts(response_parts, Body::from(response_bytes)).into_response())
        }
    } else {
        Ok(next.run(req).await)
    }
}