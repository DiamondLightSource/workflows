use argo_workflows_openapi::IoArgoprojWorkflowV1alpha1WorkflowWatchEvent;
use async_graphql::{Context, Subscription};
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

#[Subscription]
impl WorkflowsSubscription {
    /// Processing to subscribe to data for all workflows in a session
    async fn workflow(
        &self,
        ctx: &Context<'_>,
        visit: VisitInput,
        name: String,
    ) -> anyhow::Result<impl Stream<Item = Result<Workflow, String>>> {
        let auth_token = ctx
            .data_unchecked::<Option<Authorization<Bearer>>>()
            .as_ref()
            .ok_or(WorkflowParsingError::MissingAuthToken)?;

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
            .bearer_auth(auth_token.token())
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

#[derive(Debug, Deserialize)]
struct StreamError {
    /// The message associated with the error
    message: String,
}

/// Succees/fail events from Workflows API
#[derive(Debug, Deserialize)]
struct WatchEvent {
    /// Successful event
    result: Option<IoArgoprojWorkflowV1alpha1WorkflowWatchEvent>,
    /// Error returned by API
    error: Option<StreamError>,
}

// TODO! Write tests for this
