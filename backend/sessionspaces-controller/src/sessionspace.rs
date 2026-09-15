use serde::{Deserialize, Serialize};

/// The desired configuration of a SessionSpace.
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionSpaceSpec {
    pub desired_state: DesiredState,
    pub session: Session,
    pub storage: Storage,
    pub access: Access,
}

/// The requested lifecycle state of a SessionSpace.
#[derive(Debug, Deserialize, Serialize)]
pub enum DesiredState {
    Active,
    Dormant,
}

/// Visit metadata exposed to SessionSpace workloads.
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub proposal: String,
    pub visit: i32,
    pub instrument: String,
    pub start_date: String,
    pub end_date: String,
}

/// Storage configuration exposed to SessionSpace workloads.
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Storage {
    pub data_directory: String,
    pub gid: i64,
}

/// Users granted access to a SessionSpace.
#[derive(Debug, Deserialize, Serialize)]
pub struct Access {
    pub members: Vec<String>,
}
