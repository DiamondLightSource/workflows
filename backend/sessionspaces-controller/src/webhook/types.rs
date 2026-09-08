use crate::sessionspace::SessionSpaceSpec;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// A Metacontroller request containing the parent and its observed children.
#[derive(Debug, Deserialize)]
pub struct SyncRequest {
    pub parent: SessionSpace,

    #[serde(default)]
    pub children: Value,
}

/// The desired children and parent status returned to Metacontroller.
#[derive(Debug, Serialize)]
pub struct SyncResponse {
    pub children: Vec<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<Value>,
}

/// The SessionSpace fields used during reconciliation.
#[derive(Debug, Deserialize)]
pub struct SessionSpace {
    pub metadata: Metadata,
    pub spec: SessionSpaceSpec,
}

/// Parent metadata required by the controller.
#[derive(Debug, Deserialize)]
pub struct Metadata {
    pub name: String,
    pub generation: i64,
}
