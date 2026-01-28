//! HTTP utilities for request manipulation.
//!
//! Provides helper functions for cloning requests and preparing headers.

use axum::{
    body::Body,
    extract::Request,
    http::{self, HeaderValue},
};

use crate::{Result, TokenData};

/// Clone a request by consuming the body and creating two identical requests.
/// 
/// This is needed for retry logic where we might need to send the same request twice
/// (e.g., when a token refresh is needed mid-request).
///
/// # Note
/// This is an inefficient method that reads the entire body into memory.
/// Consider streaming approaches for large request bodies.
pub async fn clone_request(req: Request<Body>) -> Result<(Request<Body>, Request<Body>)> {
    let (parts, body) = req.into_parts();
    let bytes = http_body_util::BodyExt::collect(body).await?.to_bytes();
    let req1 = Request::from_parts(parts.clone(), Body::from(bytes.clone()));
    let req2 = Request::from_parts(parts, Body::from(bytes));
    Ok((req1, req2))
}

/// Prepare request headers for proxying with authentication.
/// 
/// - Adds the Authorization header with the Bearer token (if access_token is present)
/// - Removes the Cookie header (backend should authenticate via Bearer token, not cookies)
pub fn prepare_headers(req: &mut Request, token: &TokenData) {
    if let Some(access_token) = &token.access_token {
        let value = format!("Bearer {}", access_token.secret());
        tracing::debug!("Injecting Bearer token into request headers");
        
        if let Ok(header_value) = HeaderValue::from_str(&value) {
            req.headers_mut().insert(http::header::AUTHORIZATION, header_value);
        } else {
            tracing::warn!("Failed to create Authorization header value");
        }
    }
    
    // Remove cookie header - backend should authenticate via Bearer token
    req.headers_mut().remove(http::header::COOKIE);
}
