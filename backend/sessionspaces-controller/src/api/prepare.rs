//! Cluster-scoped SessionSpace persistence and generation-aware readiness polling.

use super::types::ApiError;
use crate::sessionspace::SessionSpaceSpec;
use anyhow::Context;
use axum::http::StatusCode;
use kube::{
    Api, Client,
    api::{Patch, PatchParams},
    core::{ApiResource, DynamicObject, GroupVersionKind},
};
use serde_json::{Value, json};
use std::time::Duration;

/// Creates a cluster-scoped API handle backed by the shared Kubernetes client.
pub(super) fn session_spaces(client: Client) -> Api<DynamicObject> {
    let resource = ApiResource::from_gvk(&GroupVersionKind::gvk(
        "workflows.diamond.ac.uk",
        "v1alpha1",
        "SessionSpace",
    ));
    Api::all_with(client, &resource)
}

/// Server-side applies the spec and polls readiness, rejecting replacement, deletion or generation changes.
pub(super) async fn apply_and_wait(
    api: &Api<DynamicObject>,
    name: &str,
    spec: &SessionSpaceSpec,
) -> Result<i64, ApiError> {
    let desired = json!({
        "apiVersion": "workflows.diamond.ac.uk/v1alpha1",
        "kind": "SessionSpace",
        "metadata": {"name": name},
        "spec": spec,
    });
    let applied = api
        .patch(
            name,
            &PatchParams::apply("sessionspaces-api"),
            &Patch::Apply(&desired),
        )
        .await
        .context("Applying SessionSpace")?;
    let generation = applied
        .metadata
        .generation
        .context("SessionSpace has no generation")?;
    let uid = applied.metadata.uid.clone();
    let mut current = applied;
    loop {
        if current.metadata.uid != uid
            || current.metadata.deletion_timestamp.is_some()
            || current.metadata.generation != Some(generation)
        {
            return Err(ApiError(
                StatusCode::CONFLICT,
                "SessionSpace changed during preparation; retry",
            ));
        }
        if ready(&current.data, generation) {
            return Ok(generation);
        }
        tokio::time::sleep(Duration::from_secs(1)).await;
        current = api
            .get(name)
            .await
            .context("Reading SessionSpace readiness")?;
    }
}

/// Requires an active spec, `Ready=True` and the applied generation to be observed.
fn ready(data: &Value, generation: i64) -> bool {
    data["spec"]["desiredState"] == "Active"
        && data["status"]["observedGeneration"].as_i64() == Some(generation)
        && data["status"]["conditions"]
            .as_array()
            .is_some_and(|conditions| {
                conditions
                    .iter()
                    .any(|c| c["type"] == "Ready" && c["status"] == "True")
            })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn applies_spec_and_waits_past_stale_ready() {
        use axum::{Json, Router, body::Body, extract::State, http::Request, routing::any};
        use std::sync::{
            Arc,
            atomic::{AtomicUsize, Ordering},
        };
        let requests = Arc::new(AtomicUsize::new(0));
        let app = Router::new().route(
            "/apis/workflows.diamond.ac.uk/v1alpha1/sessionspaces/mx12345-1",
            any(|State(requests): State<Arc<AtomicUsize>>, request: Request<Body>| async move {
                let index = requests.fetch_add(1, Ordering::SeqCst);
                if index == 0 {
                    assert_eq!(request.method(), "PATCH");
                    assert!(request.uri().query().unwrap().contains("fieldManager=sessionspaces-api"));
                    assert_eq!(request.headers()["content-type"], "application/apply-patch+yaml");
                    let body = axum::body::to_bytes(request.into_body(), 10000).await.unwrap();
                    let body: Value = serde_json::from_slice(&body).unwrap();
                    assert_eq!(body["spec"]["desiredState"], "Active");
                    assert!(body.get("status").is_none());
                } else {
                    assert_eq!(request.method(), "GET");
                }
                Json(json!({
                    "apiVersion": "workflows.diamond.ac.uk/v1alpha1", "kind": "SessionSpace",
                    "metadata": {"name": "mx12345-1", "uid": "test", "generation": 12},
                    "spec": {"desiredState": "Active"},
                    "status": {"observedGeneration": if index == 0 {11} else {12},
                        "conditions": [{"type": "Ready", "status": "True"}]}
                }))
            })
        ).with_state(requests.clone());
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        let client = Client::try_from(kube::Config::new(
            format!("http://{address}").parse().unwrap(),
        ))
        .unwrap();
        let api = session_spaces(client);
        let spec = serde_json::from_value(json!({"desiredState": "Active",
            "session": {"proposal": "mx12345", "visit": 1, "instrument": "i03", "startDate": "2026-01-01", "endDate": "2026-01-02"},
            "storage": {"dataDirectory": "/dls/i03/data/2026/mx12345-1", "gid": 123}, "access": {"members": ["test"]}
        })).unwrap();
        let result = tokio::time::timeout(
            Duration::from_secs(5),
            apply_and_wait(&api, "mx12345-1", &spec),
        )
        .await
        .unwrap();
        assert_eq!(result.ok(), Some(12));
        assert_eq!(requests.load(Ordering::SeqCst), 2);
        server.abort();
    }
    #[test]
    fn rejects_stale_ready_and_unready_current_generation() {
        let mut data = json!({"spec": {"desiredState": "Active"}, "status": {"observedGeneration": 11, "conditions": [{"type": "Ready", "status": "True"}]}});
        assert!(!ready(&data, 12));
        data["status"]["observedGeneration"] = json!(12);
        assert!(ready(&data, 12));
        data["status"]["conditions"][0]["status"] = json!("False");
        assert!(!ready(&data, 12));
        data["status"]["conditions"][0]["status"] = json!("True");
        data["spec"]["desiredState"] = json!("Dormant");
        assert!(!ready(&data, 12));
        assert!(!ready(&json!({}), 12));
    }
}
