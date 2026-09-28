//! Prepare a session namespace before allowing workflow submission to Argo.

use crate::graphql::CLIENT;
use anyhow::{anyhow, Result};
use reqwest::StatusCode;
use serde::Deserialize;
use serde_json::json;
use std::time::Duration;
use url::Url;

/// Timeout for preparation, which includes the API's own 120-second wait.
const PREPARE_TIMEOUT: Duration = Duration::from_secs(150);

/// Readiness confirmation returned by the preparation API.
#[derive(Deserialize)]
struct PrepareResponse {
    /// Canonical namespace the API prepared.
    namespace: String,
    /// Whether the namespace is ready for submission.
    prepared: bool,
}

/// Client-facing error returned by the preparation API.
#[derive(Deserialize)]
struct ErrorResponse {
    /// Failure message from the API.
    error: String,
}

/// Forward the caller's token and wait for preparation, failing closed on any error.
pub async fn prepare_session(api_url: &Url, namespace: &str, token: Option<&str>) -> Result<()> {
    let failure = |status: StatusCode, reason: &str| {
        tracing::warn!(namespace, %status, reason, "Session preparation failed");
        if matches!(status, StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN) {
            anyhow!("Not authorized for session {namespace}")
        } else {
            anyhow!("Could not submit workflow for session {namespace}; please try again shortly")
        }
    };
    let transport = |error: reqwest::Error, message: &'static str| {
        if error.is_timeout() {
            failure(
                StatusCode::GATEWAY_TIMEOUT,
                "SessionSpace preparation timed out",
            )
        } else {
            failure(StatusCode::BAD_GATEWAY, message)
        }
    };
    let token = token
        .filter(|token| !token.is_empty())
        .ok_or_else(|| failure(StatusCode::UNAUTHORIZED, "Missing bearer token"))?;
    let mut url = api_url.clone();
    url.path_segments_mut()
        .map_err(|_| {
            failure(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Invalid SessionSpaces API URL",
            )
        })?
        .pop_if_empty()
        .push("prepare");

    let response = CLIENT
        .post(url)
        .bearer_auth(token)
        .json(&json!({ "namespace": namespace }))
        .timeout(PREPARE_TIMEOUT)
        .send()
        .await
        .map_err(|error| transport(error, "Could not reach the SessionSpaces API"))?;

    let status = response.status();
    if !status.is_success() {
        let message = response
            .json::<ErrorResponse>()
            .await
            .ok()
            .map(|body| body.error)
            .filter(|message| !message.is_empty())
            .unwrap_or_else(|| format!("SessionSpaces API returned {status}"));
        return Err(failure(status, &message));
    }

    let prepared = response
        .json::<PrepareResponse>()
        .await
        .map_err(|error| transport(error, "Invalid SessionSpaces preparation response"))?;
    if !prepared.prepared || !prepared.namespace.eq_ignore_ascii_case(namespace) {
        return Err(failure(
            StatusCode::BAD_GATEWAY,
            "SessionSpaces API did not confirm readiness for the requested namespace",
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use mockito::Matcher;
    use rstest::rstest;

    #[tokio::test]
    #[rstest]
    #[case(
        200,
        r#"{"namespace":"mg36964-1","prepared":true,"generation":1}"#,
        None
    )]
    #[case(200, r#"{"namespace":"mg36964-1","prepared":false}"#, Some(502))]
    #[case(200, r#"{"namespace":"MG36964-1","prepared":true}"#, None)]
    #[case(200, r#"{"namespace":"mg36964-2","prepared":true}"#, Some(502))]
    #[case(200, "not JSON", Some(502))]
    #[case(200, "{}", Some(502))]
    #[case(503, "upstream unavailable", Some(503))]
    #[case(403, "{}", Some(403))]
    async fn validates_response(
        #[case] status: usize,
        #[case] body: &str,
        #[case] expected_status: Option<u16>,
    ) {
        let mut server = mockito::Server::new_async().await;
        let endpoint = server
            .mock("POST", "/api/prepare")
            .match_header("authorization", "Bearer test-token")
            .match_body(Matcher::Json(json!({"namespace": "mg36964-1"})))
            .with_status(status)
            .with_body(body)
            .create_async()
            .await;
        let url = Url::parse(&format!("{}/api/", server.url())).unwrap();
        let result = prepare_session(&url, "mg36964-1", Some("test-token")).await;
        endpoint.assert_async().await;
        match expected_status {
            Some(status) => assert!(result
                .unwrap_err()
                .to_string()
                .contains(&format!("({status} "))),
            None => assert!(result.is_ok(), "{result:?}"),
        }
    }

    #[tokio::test]
    async fn missing_token_and_connection_failure() {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let url = Url::parse(&format!("http://{}", listener.local_addr().unwrap())).unwrap();
        drop(listener);
        for (token, status) in [(None, 401u16), (Some(""), 401), (Some("token"), 502)] {
            let error = prepare_session(&url, "mg36964-1", token).await.unwrap_err();
            assert!(error.to_string().contains(&format!("({status} ")));
        }
    }
}
