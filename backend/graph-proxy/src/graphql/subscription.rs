use argo_workflows_openapi::IoArgoprojWorkflowV1alpha1WorkflowWatchEvent;
use async_graphql::{Context, SimpleObject, Subscription};
use async_stream::stream;
use axum_extra::headers::{authorization::Bearer, Authorization};
use eventsource_stream::Eventsource;
use futures_util::{Stream, StreamExt};
use serde::Deserialize;
use std::ops::Deref;

use crate::{
    graphql::{
        workflows::{Workflow, WorkflowParsingError},
        VisitInput,
    },
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

/// Succees/fail events from Workflows API
#[derive(Debug, Deserialize)]
struct WatchEvent {
    /// Successful event
    result: Option<IoArgoprojWorkflowV1alpha1WorkflowWatchEvent>,
    /// Error returned by API
    error: Option<StreamError>,
}

/// Get authentication token
fn get_auth_token(ctx: &Context<'_>) -> anyhow::Result<String> {
    ctx.data_unchecked::<Option<Authorization<Bearer>>>()
        .as_ref()
        .map(|auth| auth.token().to_string())
        .ok_or_else(|| WorkflowParsingError::MissingAuthToken.into())
}

#[Subscription]
impl WorkflowsSubscription {
    /// Processing to subscribe to logs for a single pod of a workflow
    async fn logs(
        &self,
        ctx: &Context<'_>,
        visit: VisitInput,
        workflow_name: String,
        task_id: String,
    ) -> anyhow::Result<impl Stream<Item = Result<LogEntry, String>>> {
        let auth_token = get_auth_token(ctx)?;

        let namespace = visit.to_string();
        let server_url = ctx.data_unchecked::<ArgoServerUrl>().deref().clone();
        let mut url = server_url;

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
        let log_stream = stream! {
            for await chunk_result in byte_stream {
                match chunk_result {
                    Ok(chunk) if status.is_success() => {
                        let text = String::from_utf8_lossy(&chunk).to_string();
                        for line in text.lines() {
                            match serde_json::from_str::<LogResponse>(line) {
                                Ok(parsed) => {
                                    if let Some(result) = parsed.result {
                                        yield Ok(LogEntry {
                                            content: result.content,
                                            pod_name: result.pod_name,
                                        });
                                    } else {
                                        yield Err("Missing result in log response".to_string());
                                    }
                                }
                                Err(_) => {
                                    yield Ok(LogEntry {
                                        content: line.trim().to_string(),
                                        pod_name: task_id.clone(),
                                    });
                                }
                            }
                        }
                    }
                    Ok(_) | Err(_) => {
                        yield Err("Failed to read log chunk".to_string());
                    }
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

// TODO! Write tests for this
