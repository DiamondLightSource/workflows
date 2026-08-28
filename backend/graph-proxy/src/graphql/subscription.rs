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
    s3client::{Client as S3Client, S3Bucket},
    validate_token::ValidatedAuthToken,
    ArgoServerUrl,
};

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

/// Success/fail events from Workflows API
#[derive(Debug, Deserialize)]
struct WatchEvent {
    /// Successful event
    result: Option<IoArgoprojWorkflowV1alpha1WorkflowWatchEvent>,
    /// Error returned by API
    error: Option<StreamError>,
}

/// Get authentication token
pub fn get_auth_token(ctx: &Context<'_>) -> anyhow::Result<String> {
    let auth_token = ctx.data_unchecked::<ValidatedAuthToken>().as_token();

    auth_token
        .as_ref()
        .map(|auth| auth.token().to_string())
        .ok_or_else(|| WorkflowParsingError::MissingAuthToken.into())
}

#[Subscription(guard = "AuthGuard")]
impl WorkflowsSubscription {
    /// Subscribe to logs for a single pod of a workflow.
    ///
    /// Logs are streamed live from Argo while the pod is running.
    /// Once the Argo stream finishes, the archived main.log is retrieved
    /// from S3 and any lines not already sent are emitted.
    async fn logs(
        &self,
        ctx: &Context<'_>,
        visit: VisitInput,
        workflow_name: String,
        task_id: String,
    ) -> anyhow::Result<impl Stream<Item = Result<LogEntry, String>>> {
        let auth_token = get_auth_token(ctx)?;

        if task_id.is_empty() || task_id == "__NO_TASK_SELECTED__" {
            return Err(anyhow::anyhow!(
                "A valid task ID is required to retrieve task logs"
            ));
        }

        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref().clone();
        let mut url = server_url;

        let namespace = visit.to_string();

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

        let s3_client = ctx
            .data::<S3Client>()
            .map_err(|_| anyhow::anyhow!("Missing S3 client"))?
            .clone();

        let s3_bucket = ctx
            .data::<S3Bucket>()
            .map_err(|_| anyhow::anyhow!("Missing S3 bucket"))?
            .clone();

        let s3_key = format!("{workflow_name}/{task_id}/main.log");

        // Check S3 first because the task pod may already have been deleted
        // while the overall workflow is still running.
        let initial_archive = match s3_client
            .get_object()
            .bucket(s3_bucket.clone())
            .key(&s3_key)
            .send()
            .await
        {
            Ok(response) => {
                tracing::info!(
                    "ARCHIVE_FOUND_BEFORE_LIVE task={} workflow={} key={}",
                    task_id,
                    workflow_name,
                    s3_key
                );

                Some(response)
            }

            Err(_) => {
                tracing::info!(
                    "ARCHIVE_NOT_FOUND_BEFORE_LIVE task={} workflow={}",
                    task_id,
                    workflow_name
                );

                None
            }
        };

        // Only contact the Argo live-log endpoint when the archived
        // main.log is not already available in S3.
        let live_response = if initial_archive.is_none() {
            tracing::info!(
                "STARTING_LIVE_STREAM namespace={} workflow={} task={}",
                namespace,
                workflow_name,
                task_id
            );

            let client = reqwest::Client::new();

            Some(
                client
                    .get(url)
                    .bearer_auth(auth_token)
                    .header("Accept", "text/plain")
                    .send()
                    .await?,
            )
        } else {
            None
        };

        let live_status = live_response.as_ref().map(|response| response.status());

        let mut byte_stream = live_response.map(|response| response.bytes_stream());

        let log_stream = stream! {
            if let Some(archive_response) = initial_archive {
                let archive_bytes = match archive_response.body.collect().await {
                    Ok(bytes) => bytes,

                    Err(err) => {
                        yield Err(format!(
                            "Failed to read archived log artifact: {err}"
                        ));
                        return;
                    }
                };

                let archived_text = String::from_utf8_lossy(
                    archive_bytes.into_bytes().as_ref(),
                )
                .to_string();

                for line in archived_text.lines() {
                    let content = line.trim_end();

                    if content.is_empty()
                        || should_skip_log_line(content)
                    {
                        continue;
                    }

                    yield Ok(LogEntry {
                        content: content.to_string(),
                        pod_name: task_id.clone(),
                    });
                }

                tracing::info!(
                    "ARCHIVE_EMITTED_BEFORE_LIVE task={} workflow={} key={}",
                    task_id,
                    workflow_name,
                    s3_key
                );

                return;
            }

            let mut live_lines = Vec::new();
            let mut archive_check =
                tokio::time::interval(std::time::Duration::from_secs(2));
            archive_check.tick().await;
            archive_check.set_missed_tick_behavior(
                tokio::time::MissedTickBehavior::Skip,
            );

            'live_stream: loop {
                tokio::select! {
                    chunk_result = async {
                    match byte_stream.as_mut() {
                    Some(stream) => stream.next().await,
                    None => None,
                    }
                    } => {
                        match chunk_result {
                            Some(Ok(chunk))
                                if live_status
                                    .map(|status| status.is_success())
                                    .unwrap_or(false) =>
                            {
                                let text =
                                    String::from_utf8_lossy(&chunk).to_string();

                                for line in text.lines() {
                                    match serde_json::from_str::<LogResponse>(line) {
                                        Ok(parsed) => {
                                            if let Some(result) = parsed.result {
                                                let content = result.content;

                                                let skip_line =
                                                    content.contains("capturing logs")
                                                    || content.contains("waiting for signals")
                                                    || content.contains("sub-process exited")
                                                    || content.contains("file signal handler exiting")
                                                    || content.contains("no need to save artifact")
                                                    || content.contains("no need to save parameter");

                                                if skip_line {
                                                    continue;
                                                }

                                                live_lines.push(content.clone());

                                                yield Ok(LogEntry {
                                                    content,
                                                    pod_name: result.pod_name,
                                                });
                                            } else {
                                                yield Err(
                                                    "Missing result in log response"
                                                        .to_string()
                                                );
                                            }
                                        }

                                        Err(_) => {
                                            let content = line.trim().to_string();

                                            if content.starts_with("{\"result\"") {
                                                continue;
                                            }

                                            if !content.is_empty()
                                                && !should_skip_log_line(&content)
                                            {
                                                live_lines.push(content.clone());

                                                yield Ok(LogEntry {
                                                    content,
                                                    pod_name: task_id.clone(),
                                                });
                                            }
                                        }
                                    }
                                }
                            }

                            Some(Ok(_)) => {
                                tracing::info!(
                                    "Live log request unavailable for task {}; checking archive",
                                    task_id
                                );

                                break 'live_stream;
                            }

                            Some(Err(err)) => {
                                tracing::warn!(
                                    "Live log stream ended for task {}: {}; checking archive",
                                    task_id,
                                    err
                                );

                                break 'live_stream;
                            }

                            None => {
                                tracing::info!(
                                    "Live log stream completed for task {}; checking archive",
                                    task_id
                                );

                                break 'live_stream;
                            }
                        }
                    }

                    _ = archive_check.tick() => {
                        let archive_available = s3_client
                            .head_object()
                            .bucket(s3_bucket.clone())
                            .key(&s3_key)
                            .send()
                            .await
                            .is_ok();

                        if archive_available {
                            tracing::info!(
                                "Archived log is available before workflow completion: {}",
                                s3_key
                            );

                            break 'live_stream;
                        }
                    }
                }
            }

            // The live Argo stream has finished. The durable log should now
            // be available in the S3 artifact.
            tracing::info!(
                "LIVE_STREAM_ENDED task={} workflow={}",
                task_id,
                workflow_name
            );

            tracing::info!(
                "ARCHIVE_LOOKUP bucket={} key={}",
                s3_bucket.0,
                s3_key
            );

            let archive_response = {
                let mut attempts = 0;

                loop {
                    attempts += 1;

                    match s3_client
                        .get_object()
                        .bucket(s3_bucket.clone())
                        .key(&s3_key)
                        .send()
                        .await
                    {
                        Ok(response) => {
                            tracing::info!(
                                "ARCHIVE_RETRIEVED task={} workflow={} key={}",
                                task_id,
                                workflow_name,
                                s3_key
                            );

                            break response;
                        }

                        Err(_) if attempts < 10 => {
                            tracing::info!(
                                "Archived log not available yet for task {}; \
                                retrying S3 lookup, attempt {}",
                                task_id,
                                attempts
                            );

                            tokio::time::sleep(
                                std::time::Duration::from_secs(1)
                            )
                            .await;
                        }

                        Err(_err) => {
                            yield Err("No logs available".to_string());
                            return;
                        }
                    }
                }
            };
            let archive_bytes = match archive_response.body.collect().await {
                Ok(bytes) => bytes,

                Err(err) => {
                    yield Err(format!(
                        "Failed to read archived log artifact: {err}"
                    ));
                    return;
                }
            };

            let archived_text =
                String::from_utf8_lossy(archive_bytes.into_bytes().as_ref()).to_string();

            let archived_lines: Vec<String> = archived_text
                .lines()
                .filter(|line| {
                    !line.contains("capturing logs")
                        && !line.contains("waiting for signals")
                        && !line.contains("sub-process exited")
                        && !line.contains("file signal handler exiting")
                        && !line.contains("no need to save artifact")
                        && !line.contains("no need to save parameter")
                })
                .map(str::to_string)
                .collect();

            // Determine where the archived log begins beyond what was already
            // sent by the live Argo stream.
            let mut archive_start = 0;

            while archive_start < live_lines.len()
                && archive_start < archived_lines.len()
                && live_lines[archive_start] == archived_lines[archive_start]
            {
                archive_start += 1;
            }

            // If the archive and live stream don't share the same prefix,
            // try to locate the final live line in the archive.
            if archive_start < live_lines.len() {
                if let Some(last_live_line) = live_lines.last() {
                    if let Some(position) = archived_lines
                        .iter()
                        .rposition(|line| line == last_live_line)
                    {
                        archive_start = position + 1;
                    } else {
                        yield Err(
                            "Unable to reconcile live and archived logs".to_string()
                        );
                        return;
                    }
                }
            }
            tracing::info!(
                "ARCHIVE_DEBUG task={} live_lines={} archived_lines={} archive_start={}",
                task_id,
                live_lines.len(),
                archived_lines.len(),
                archive_start
            );

            // Send only the archived lines that were not already emitted
            // from the live Argo stream.
            for line in archived_lines.into_iter().skip(archive_start) {
                yield Ok(LogEntry {
                    content: line,
                    pod_name: task_id.clone(),
                });
            }
        };

        Ok(log_stream)
    }

    /// Subscribe to data for all workflows in a session.
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

                    Err(_) => Err("Failed to read event from stream".to_string()),
                }
            }
        });

        Ok(stream)
    }
}

/// Returns true for Argo executor messages that should not be displayed.
fn should_skip_log_line(content: &str) -> bool {
    content.contains("capturing logs")
        || content.contains("waiting for signals")
        || content.contains("sub-process exited")
        || content.contains("file signal handler exiting")
        || content.contains("no need to save artifact")
        || content.contains("no need to save parameter")
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

    use crate::graphql::root_schema_builder;
    use crate::graphql::Visit;
    use crate::validate_token::ValidatedAuthToken;
    use crate::{ArgoServerUrl, Client, S3Bucket, S3ClientArgs};

    fn test_token() -> ValidatedAuthToken {
        let token = Authorization::bearer("test-token").expect("token always valid");

        ValidatedAuthToken::Valid(token)
    }

    #[tokio::test]
    async fn logs_subscription_reads_archived_s3_log_before_live_stream() {
        let workflow_name = "numpy-benchmark-wdkwj";
        let task_id = "numpy-benchmark-wdkwj";

        let visit = Visit {
            proposal_code: "mg".to_string(),
            proposal_number: 36964,
            number: 1,
        };

        let mut server = mockito::Server::new_async().await;

        // No Argo log request is expected.
        //
        // The implementation now checks S3 first and returns the
        // archived log immediately when main.log exists.

        // Mock the archived S3 main.log.
        //
        // Path-style S3 addressing produces:
        //
        // /test-bucket/numpy-benchmark-wdkwj/numpy-benchmark-wdkwj/main.log
        let _s3_key = format!("{workflow_name}/{task_id}/main.log");
        // let s3_path = format!("/test-bucket/{s3_key}");

        let s3_log_endpoint = server
            .mock("GET", mockito::Matcher::Any)
            .with_status(200)
            .with_header("content-type", "text/plain")
            .with_body("line 1\nline 2\nline 3\nline 4\n")
            .create_async()
            .await;

        let s3_bucket = S3Bucket("test-bucket".to_string());

        let s3_client_args = S3ClientArgs {
            s3_endpoint_url: Some(Url::parse(&server.url()).unwrap()),
            s3_access_key_id: Some("test-access-key".to_string()),
            s3_secret_access_key: Some("test-secret-key".to_string()),
            s3_force_path_style: true,
            s3_region: Some("us-west-2".to_string()),
        };

        let s3_client = Client::from(s3_client_args);

        let argo_server_url = Url::parse(&server.url()).unwrap();

        let schema = root_schema_builder()
            .data(ArgoServerUrl(argo_server_url))
            .data(test_token())
            .data(s3_client)
            .data(s3_bucket)
            .finish();

        let request = Request::new(format!(
            r#"
            subscription {{
                logs(
                    visit: {{
                        proposalCode: "{}",
                        proposalNumber: {},
                        number: {}
                    }}
                    workflowName: "{}"
                    taskId: "{}"
                ) {{
                    content
                    podName
                }}
            }}
            "#,
            visit.proposal_code, visit.proposal_number, visit.number, workflow_name, task_id,
        ));

        let mut response_stream = schema.execute_stream(request);

        let mut logs = Vec::new();

        while let Some(response) = response_stream.next().await {
            assert!(
                response.errors.is_empty(),
                "unexpected GraphQL errors: {:?}",
                response.errors
            );

            let data = response.data.into_json().expect("invalid response JSON");

            if let Some(log) = data.get("logs").and_then(|value| value.as_object()) {
                logs.push((
                    log["content"].as_str().unwrap().to_string(),
                    log["podName"].as_str().unwrap().to_string(),
                ));
            }

            if logs.len() == 4 {
                break;
            }
        }

        assert_eq!(
            logs,
            vec![
                ("line 1".to_string(), task_id.to_string()),
                ("line 2".to_string(), task_id.to_string()),
                ("line 3".to_string(), task_id.to_string()),
                ("line 4".to_string(), task_id.to_string()),
            ]
        );

        s3_log_endpoint.assert_async().await;
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
                    visit: {{
                        proposalCode: "{}",
                        proposalNumber: {},
                        number: {}
                    }}
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
                    visit: {
                        proposalCode: "xy",
                        proposalNumber: 1234,
                        number: 5678
                    }
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
