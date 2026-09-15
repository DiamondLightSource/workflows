use axum::Json;

use super::{
    reconcile::reconcile,
    types::{SyncRequest, SyncResponse},
};

/// Handles one Metacontroller synchronization request.
pub async fn sync(Json(request): Json<SyncRequest>) -> Json<SyncResponse> {
    let name = request.parent.metadata.name.clone();
    let generation = request.parent.metadata.generation;

    tracing::info!(sessionspace = name, generation, "reconciling SessionSpace");

    let response = reconcile(request);

    tracing::info!(
        sessionspace = name,
        generation,
        desired_children = response.children.len(),
        "SessionSpace reconciled"
    );

    Json(response)
}

/// Reports whether the webhook process is available.
pub async fn health() -> &'static str {
    "ok"
}
