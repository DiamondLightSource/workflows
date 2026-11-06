use std::sync::Arc;

use axum::Json;
use axum::extract::State;
use serde_json::Value;

use super::{
    config::Config,
    reconcile::reconcile,
    types::{CustomizeResponse, RelatedResourceRule, SyncRequest, SyncResponse},
};

/// Handles one Metacontroller synchronization request.
pub async fn sync(
    State(config): State<Arc<Config>>,
    Json(request): Json<SyncRequest>,
) -> Json<SyncResponse> {
    let name = request.parent.metadata.name.clone();
    let generation = request.parent.metadata.generation;

    tracing::info!(sessionspace = name, generation, "reconciling SessionSpace");

    let response = reconcile(request, &config);

    tracing::info!(
        sessionspace = name,
        generation,
        desired_children = response.children.len(),
        "SessionSpace reconciled"
    );

    Json(response)
}

/// Handles the Metacontroller `customize` hook, declaring the source resources
/// (Secrets/ConfigMaps) to watch so copies react to host-side changes.
pub async fn customize(
    State(config): State<Arc<Config>>,
    Json(_request): Json<Value>,
) -> Json<CustomizeResponse> {
    let related_resources = config
        .copy_sources
        .iter()
        .map(|source| RelatedResourceRule {
            api_version: "v1",
            resource: source.kind.as_resource(),
            namespace: source.namespace.clone(),
            names: vec![source.name.clone()],
        })
        .collect();

    Json(CustomizeResponse { related_resources })
}

/// Reports whether the webhook process is available.
pub async fn health() -> &'static str {
    "ok"
}
