//! Admin authentication middleware for protecting sensitive endpoints.
//!
//! This module provides a simple token-based authentication layer for admin-only
//! routes like the debug endpoint. Authentication is performed via a secret token
//! passed in the `X-Admin-Token` header.
//!
//! # Configuration
//!
//! Set the `WORKFLOWS_ADMIN_TOKEN` environment variable to enable admin endpoints.
//! If not set, all admin requests will be rejected with 401 Unauthorized.
//!
//! # Example
//!
//! ```ignore
//! use axum::{middleware, routing::get, Router};
//! use crate::admin_auth::require_admin_auth;
//!
//! let router = Router::new()
//!     .route("/debug", get(debug_handler))
//!     .layer(middleware::from_fn(require_admin_auth));
//! ```
//!
//! Then call with:
//! ```bash
//! curl -H "X-Admin-Token: your-secret" http://localhost:8080/debug
//! ```

use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
};

/// The header name for the admin authentication token.
pub const ADMIN_TOKEN_HEADER: &str = "X-Admin-Token";

/// Environment variable name for the admin token.
pub const ADMIN_TOKEN_ENV: &str = "WORKFLOWS_ADMIN_TOKEN";

/// Middleware function that checks for admin authentication.
///
/// This middleware reads the expected token from the `WORKFLOWS_ADMIN_TOKEN`
/// environment variable and compares it against the `X-Admin-Token` header
/// in incoming requests.
///
/// # Returns
///
/// - `200 OK` with the inner handler's response if authentication succeeds
/// - `401 Unauthorized` if the token is missing, invalid, or not configured
pub async fn require_admin_auth(req: Request, next: Next) -> Response {
    // Check if admin token is configured
    let Ok(expected_token) = std::env::var(ADMIN_TOKEN_ENV) else {
        tracing::warn!("Admin endpoint accessed but no admin token configured");
        return (StatusCode::UNAUTHORIZED, "Admin token not configured").into_response();
    };

    // Check for the admin token header
    let provided_token = req
        .headers()
        .get(ADMIN_TOKEN_HEADER)
        .and_then(|v| v.to_str().ok());

    match provided_token {
        Some(token) if token == expected_token => {
            // Token matches, proceed with the request
            next.run(req).await
        }
        Some(_) => {
            tracing::warn!("Admin endpoint accessed with invalid token");
            (StatusCode::UNAUTHORIZED, "Invalid admin token").into_response()
        }
        None => {
            tracing::debug!("Admin endpoint accessed without token");
            (StatusCode::UNAUTHORIZED, "Admin token required").into_response()
        }
    }
}
