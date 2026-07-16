use std::sync::Arc;

use axum::{
    extract::{Request, State},
    http::{HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
};
use tracing::error;

use super::extract_service_account_token::extract_service_account_token;
use crate::state::AuthBrokerState;

use super::authz_error::AuthzError;
use super::pod_identity::PodIdentity;
use super::resolve_subject::resolve_subject;

pub async fn authorize_request(
    State(state): State<Arc<AuthBrokerState>>,
    req: Request,
) -> Response {
    match authorize_request_inner(state, req).await {
        Ok(response) => response,
        Err(e) => e.into_response(),
    }
}

async fn authorize_request_inner(
    state: Arc<AuthBrokerState>,
    req: Request,
) -> Result<Response, AuthzError> {
    let service_account_token = extract_service_account_token(&req)?;

    let token_review = state
        .k8s
        .create_token_review(&service_account_token)
        .await
        .map_err(AuthzError::from)?;

    let identity = PodIdentity::new(&token_review)?;

    let pod = state
        .k8s
        .get_pod(&identity.pod_namespace, &identity.pod_name)
        .await
        .map_err(|err| {
            AuthzError::PodNotFound(format!(
                "{}/{}: {err}",
                identity.pod_namespace, identity.pod_name
            ))
        })?;

    if let Some(expected_uid) = &identity.pod_uid {
        let actual_uid = pod.metadata.uid.as_deref().unwrap_or("");
        if actual_uid != expected_uid.as_str() {
            return Err(AuthzError::PodUidMismatch {
                expected: expected_uid.clone(),
                actual: actual_uid.to_owned(),
            });
        }
    }

    let pod_uid = pod.metadata.uid.as_deref().unwrap_or("");
    let pod_key = format!(
        "{}/{}/{}",
        identity.pod_namespace, identity.pod_name, pod_uid
    );
    let subject = match state.get_cached_subject(&pod_key).await {
        Some(s) => s,
        None => {
            let s = resolve_subject(&*state.k8s, &pod).await?;
            state.set_cached_subject(pod_key, s.clone()).await;
            s
        }
    };

    let access_token = state.get_or_refresh_token(&subject).await.map_err(|err| {
        error!("ext_authz: token retrieval failed for subject={subject}: {err:?}");
        AuthzError::TokenValidation(format!("{err:?}"))
    })?;

    let bearer = format!("Bearer {access_token}");
    let mut response = StatusCode::OK.into_response();
    response.headers_mut().insert(
        header::AUTHORIZATION,
        HeaderValue::from_str(&bearer).map_err(|err| {
            error!("ext_authz: failed to construct Bearer header for subject={subject}: {err:?}");
            AuthzError::TokenValidation(format!("{err:?}"))
        })?,
    );
    Ok(response)
}
