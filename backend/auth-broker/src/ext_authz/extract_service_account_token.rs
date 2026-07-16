use axum::extract::Request;

use super::authz_error::AuthzError;

pub fn extract_service_account_token(req: &Request) -> Result<String, AuthzError> {
    req.headers()
        .get("K8s-Pod-Service-Account-Token")
        .and_then(|v| v.to_str().ok())
        .map(str::to_owned)
        .ok_or(AuthzError::MissingToken)
}
