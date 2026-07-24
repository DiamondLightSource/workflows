use crate::graphql::AuthGuard;
use argo_workflows_openapi::IoArgoprojWorkflowV1alpha1WorkflowWatchEvent;
use async_graphql::{Context, SimpleObject, Subscription};
use async_stream::stream;
use eventsource_stream::Eventsource;
use futures_util::{Stream, StreamExt};
use serde::Deserialize;
use std::ops::Deref;



use crate::{
    graphql::{
        workflows::{Workflow, WorkflowParsingError},
        VisitInput,
    },
    s3client::{Client, S3Bucket},
    validate_token::ValidatedAuthToken,
    ArgoServerUrl,
};

use crate::log_storage::upload_logs;



/// Subscribe to events involving workflows
#[derive(Debug, Clone, Default)]
pub struct WorkflowsSubscription;

/// A single log line streamed from a pod
#[derive(Debug, Clone, SimpleObject)]
pub struct LogEntry {
    /// The log line content
    content: String,
    /// The name of the pod producing the log
    pod_name: String,
}

/// A log response returned by the Argo logs API
#[derive(Debug, Deserialize)]
struct LogResponse {
    /// The result of the log response
    result: Option<LogContent>,
}

/// The data from the log result returned by the Argo logs API
#[derive(Debug, Deserialize)]
struct LogContent {
    /// The log content
    content: String,
    /// The name of the pod producing the log
    #[serde(rename = "podName")]
    pod_name: String,
}

/// Succees/fail events from Workflows API
#[derive(Debug, Deserialize)]
struct WatchEvent {
    /// Successful event
    result: Option<IoArgoprojWorkflowV1alpha1WorkflowWatchEvent>,
    /// Error returned by API
    error: Option<StreamError>,
}

/// Get authentication token
pub fn get_auth_token(ctx: &Context<'_>) -> anyhow::Result<String>{
    let auth_token = ctx.data_unchecked::<ValidatedAuthToken>().as_token();
    auth_token
        .as_ref()
        .map(|auth| auth.token().to_string())
        .ok_or_else(|| WorkflowParsingError::MissingAuthToken.into())
}

#[Subscription(guard = "AuthGuard")]
impl WorkflowsSubscription {
    /// Processing to subscribe to logs for a single pod of a workflow
/// Processing to subscribe to logs for a single pod of a workflow
    async fn logs(
        &self,
        ctx: &Context<'_>,
        visit: VisitInput,
        workflow_name: String,
        task_id: String,
    ) -> anyhow::Result<impl Stream<Item = Result<LogEntry, String>>> {
        let auth_token = get_auth_token(ctx)?;

        let s3_client = ctx.data_unchecked::<Client>().clone();
        let s3_bucket = ctx.data_unchecked::<S3Bucket>().clone();

        let namespace = visit.to_string();
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref().clone();
        let mut url = server_url;

        let s3_key = format!("{}/{}/{}.log", namespace, workflow_name, task_id);

        url.path_segments_mut().expect("Invalid base URL").extend([
            "api",
            "v1",
            "workflows",
            &namespace,
            &workflow_name,
            "log",
        ]);

        url.query_pairs_mut()
            .append_pair("podName", &task_id)
            .append_pair("logOptions.container", "main")
            .append_pair("logOptions.follow", "true");

        let client = reqwest::Client::new();

        let response = client
            .get(url)
            .bearer_auth(auth_token)
            .header("Accept", "text/plain")
            .send()
            .await?;

        let status = response.status();
        let byte_stream = response.bytes_stream();

        let fallback_pod_name = task_id.clone();

        let log_stream = stream! {
            let mut all_logs = String::new();
            let mut error_body = String::new();

            for await chunk_result in byte_stream {
                match chunk_result {
                    Ok(chunk) if status.is_success() => {
                        let text = String::from_utf8_lossy(&chunk).to_string();

                        for line in text.lines() {
                            let line = line.trim_end();

                            if line.is_empty() {
                                continue;
                            }

                            match serde_json::from_str::<LogResponse>(line) {
                                Ok(parsed) => {
                                    if let Some(result) = parsed.result {
                                        all_logs.push_str(&result.content);
                                        all_logs.push('\n');

                                        yield Ok(LogEntry {
                                            content: result.content,
                                            pod_name: result.pod_name,
                                        });
                                    } else {
                                        yield Err("Missing result in log response".to_string());
                                    }
                                }

                                Err(_) => {
                                    all_logs.push_str(line);
                                    all_logs.push('\n');

                                    yield Ok(LogEntry {
                                        content: line.to_string(),
                                        pod_name: fallback_pod_name.clone(),
                                    });
                                }
                            }
                        }
                    }

                    Ok(chunk) => {
                        error_body.push_str(&String::from_utf8_lossy(&chunk));
                    }

                    Err(err) => {
                        yield Err(format!("Failed to read log chunk: {err}"));
                    }
                }
            }

            if !status.is_success() {
                let body = error_body.trim();

                if body.is_empty() {
                    yield Err(format!("Argo logs API returned HTTP {status}"));
                } else {
                    yield Err(format!("Argo logs API returned HTTP {status}: {body}"));
                }
            } else if !all_logs.is_empty() {
                if let Err(err) = upload_logs(
                    &s3_client,
                    &s3_bucket,
                    &s3_key,
                    all_logs,
                )
                .await
                {
                    yield Err(format!("Failed to upload logs to S3: {err}"));
                }
            }
        };

        Ok(log_stream)
    }
        /// Processing to subscribe to data for all workflows in a session
    async fn workflow(
        &self,
        ctx: &Context<'_>,
        visit: VisitInput,
        name: String,
    ) -> anyhow::Result<impl Stream<Item = Result<Workflow, String>>> {
        let auth_token = get_auth_token(ctx)?;

        let session = visit.to_string();
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref();
        let mut url = server_url.clone();

        url.path_segments_mut().expect("Invalid base URL").extend([
            "api",
            "v1",
            "workflow-events",
            &session,
        ]);

        url.query_pairs_mut().append_pair(
            "listOptions.fieldSelector",
            &format!("metadata.name={name},metadata.namespace={visit}"),
        );

        let client = reqwest::Client::new();
        let response = client
            .get(url)
            .bearer_auth(auth_token)
            .header("Accept", "text/event-stream")
            .send()
            .await?
            .bytes_stream()
            .eventsource();

        let stream = response.then(move |event_result| {
            let session_clone = visit.clone();
            async move {
                match event_result {
                    Ok(event) => {
                        let watch_event: WatchEvent =
                            serde_json::from_str(&event.data).map_err(|e| e.to_string())?;

                        match (watch_event.result, watch_event.error) {
                            (Some(result), None) => {
                                if let Some(workflow) = result.object {
                                    Ok(Workflow::new(workflow, session_clone.into()))
                                } else {
                                    Err("No workflow object returned".to_string())
                                }
                            }
                            (None, Some(err)) => Err(err.message),
                            (None, None) => Err("Missing result and error in event".to_string()),
                            (Some(_), Some(_)) => {
                                Err("Conflicting result and error in event".to_string())
                            }
                        }
                    }
                    Err(_err) => Err("Failed to read event from stream".to_string()),
                }
            }
        });

        Ok(stream)
    }
}

/// Struct for storing message of StreamError
#[derive(Debug, Deserialize)]
struct StreamError {
    /// The message associated with the error
    message: String,
}

#[cfg(test)]
mod tests {

    use std::{env, fs, path::PathBuf};

    use async_graphql::Request;
    use axum_extra::headers::Authorization;
    use futures_util::StreamExt;
    use mockito::Matcher;
    use rstest::rstest;
    use serde_json::{json, Value};
    use url::Url;

    use crate::graphql::Visit;
    use crate::ArgoServerUrl;

    use crate::graphql::root_schema_builder;
    use crate::validate_token::ValidatedAuthToken;

    fn test_token() -> ValidatedAuthToken {
        let token = Authorization::bearer("test-token").expect("token always valid");
        ValidatedAuthToken::Valid(token)
    }

    #[tokio::test]
    async fn single_workflow_subscription_returns_first_event() {
        let workflow_name = "numpy-benchmark-wdkwj";
        let visit = Visit {
            proposal_code: "mg".to_string(),
            proposal_number: 36964,
            number: 1,
        };

        let mut workflow_file_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        workflow_file_path.push("test-assets");
        workflow_file_path.push("get-workflow-wdkwj.json");

        let workflow_json =
            fs::read_to_string(&workflow_file_path).expect("failed to read workflow test asset");

        let workflow_value: Value =
            serde_json::from_str(&workflow_json).expect("workflow fixture is not valid JSON");

        let event_payload = json!({
            "result": {
                "object": workflow_value
            },
            "error": null
        });

        let sse_body = format!(
            "data: {}\n\n",
            serde_json::to_string(&event_payload).expect("failed to serialize SSE payload")
        );

        let mut server = mockito::Server::new_async().await;
        let path = format!("/api/v1/workflow-events/{visit}");
        let workflow_events_endpoint = server
            .mock("GET", path.as_str())
            .match_query(Matcher::UrlEncoded(
                "listOptions.fieldSelector".into(),
                format!("metadata.name={workflow_name},metadata.namespace={visit}"),
            ))
            .with_status(200)
            .with_header("content-type", "text/event-stream")
            .with_body(sse_body)
            .create_async()
            .await;

        let argo_server_url = Url::parse(&server.url()).unwrap();

        let schema = root_schema_builder()
            .data(ArgoServerUrl(argo_server_url))
            .data(test_token())
            .finish();

        let request = Request::new(format!(
            r#"
        subscription {{
            workflow(
                name: "{}",
                visit: {{ proposalCode: "{}", proposalNumber: {}, number: {} }}
            ) {{
                name
            }}
        }}
        "#,
            workflow_name, visit.proposal_code, visit.proposal_number, visit.number
        ));

        let mut response_stream = schema.execute_stream(request);

        let first_response = response_stream
            .next()
            .await
            .expect("subscription stream ended before first response");

        assert!(
            first_response.errors.is_empty(),
            "unexpected GraphQL errors: {:?}",
            first_response.errors
        );

        let expected_data = json!({
            "workflow": {
                "name": workflow_name
            }
        });

        assert_eq!(
            first_response
                .data
                .into_json()
                .expect("invalid response json"),
            expected_data
        );

        workflow_events_endpoint.assert_async().await;
    }

    #[tokio::test]
    #[rstest]
    #[case(ValidatedAuthToken::Missing)]
    #[case(ValidatedAuthToken::Invalid)]
    #[case(ValidatedAuthToken::Failed("reason".to_string()))]
    async fn unauthenticated_subscription_returns_null(#[case] auth_token: ValidatedAuthToken) {
        use crate::graphql::auth_guard::AuthErrorCode;

        let schema = root_schema_builder().data(auth_token).finish();

        let request = Request::new(
            r#"
        subscription {
            workflow(
                name: "workflowName",
                visit: { proposalCode: "xy", proposalNumber: 1234, number: 5678 }
            ) {
                name
            }
        }
    "#,
        );

        let mut response_stream = schema.execute_stream(request);

        let first_response = response_stream
            .next()
            .await
            .expect("subscription stream ended before first response");

        let expected_data = json!(null);
        assert_eq!(
            first_response
                .data
                .into_json()
                .expect("invalid response json"),
            expected_data
        );

        let error_code = first_response.errors[0]
            .extensions
            .as_ref()
            .expect("missing extensions")
            .get("code")
            .expect("missing code")
            .clone()
            .into_json()
            .expect("invalid json");

        let expected_value = json!(AuthErrorCode::Unauthenticated.to_string());
        assert_eq!(error_code, expected_value);
    }
}
