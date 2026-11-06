use crate::sessionspace::SessionSpaceSpec;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// A Metacontroller request containing the parent and its observed children.
#[derive(Debug, Deserialize)]
pub struct SyncRequest {
    pub parent: SessionSpace,

    #[serde(default)]
    pub children: Value,

    /// Source resources requested via the `customize` hook's `relatedResources`.
    #[serde(default)]
    pub related: Value,
}

/// The desired children and parent status returned to Metacontroller.
#[derive(Debug, Serialize)]
pub struct SyncResponse {
    pub children: Vec<Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<Value>,
}

/// The response from the `customize` hook, listing resources the controller
/// should watch and expose to the `sync` hook as `related`.
#[derive(Debug, Serialize)]
pub struct CustomizeResponse {
    #[serde(rename = "relatedResources")]
    pub related_resources: Vec<RelatedResourceRule>,
}

/// A single resource rule describing one source object to watch.
#[derive(Debug, Serialize)]
pub struct RelatedResourceRule {
    #[serde(rename = "apiVersion")]
    pub api_version: &'static str,
    pub resource: &'static str,
    pub namespace: String,
    pub names: Vec<String>,
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
