use serde::Serialize;
use serde_json::Value;

use super::types::SessionSpace;

/// The summarized lifecycle state reported for a SessionSpace.
#[derive(Clone, Copy, Serialize)]
pub(super) enum Phase {
    Activating,
    Active,
    Deactivating,
    Dormant,
}

impl Phase {
    fn conditions(self) -> &'static [Condition] {
        match self {
            Self::Activating => ACTIVATING_CONDITIONS,
            Self::Active => ACTIVE_CONDITIONS,
            Self::Deactivating => DEACTIVATING_CONDITIONS,
            Self::Dormant => DORMANT_CONDITIONS,
        }
    }
}

#[derive(Serialize)]
struct Condition {
    #[serde(rename = "type")]
    condition_type: ConditionType,
    status: ConditionStatus,
    reason: &'static str,
    message: &'static str,
}

impl Condition {
    const fn new(
        condition_type: ConditionType,
        status: ConditionStatus,
        reason: &'static str,
        message: &'static str,
    ) -> Self {
        Self {
            condition_type,
            status,
            reason,
            message,
        }
    }
}

#[derive(Serialize)]
enum ConditionType {
    Ready,
    Dormant,
}

#[derive(Serialize)]
enum ConditionStatus {
    True,
    False,
}

const ACTIVATING_CONDITIONS: &[Condition] = &[
    Condition::new(
        ConditionType::Ready,
        ConditionStatus::False,
        "Reconciling",
        "Waiting for SessionSpace resources to become ready",
    ),
    Condition::new(
        ConditionType::Dormant,
        ConditionStatus::False,
        "ResourcesPresent",
        "SessionSpace is being materialized",
    ),
];

const ACTIVE_CONDITIONS: &[Condition] = &[
    Condition::new(
        ConditionType::Ready,
        ConditionStatus::True,
        "ResourcesReady",
        "All SessionSpace resources are ready",
    ),
    Condition::new(
        ConditionType::Dormant,
        ConditionStatus::False,
        "ResourcesPresent",
        "SessionSpace resources are materialized",
    ),
];

const DEACTIVATING_CONDITIONS: &[Condition] = &[
    Condition::new(
        ConditionType::Ready,
        ConditionStatus::False,
        "Deactivating",
        "SessionSpace is not ready while resources are being removed",
    ),
    Condition::new(
        ConditionType::Dormant,
        ConditionStatus::False,
        "RemovingResources",
        "Waiting for SessionSpace resources to be removed",
    ),
];

const DORMANT_CONDITIONS: &[Condition] = &[
    Condition::new(
        ConditionType::Ready,
        ConditionStatus::False,
        "Dormant",
        "SessionSpace is dormant and cannot accept workflows",
    ),
    Condition::new(
        ConditionType::Dormant,
        ConditionStatus::True,
        "ResourcesRemoved",
        "All SessionSpace resources have been removed",
    ),
];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Status {
    observed_generation: i64,
    phase: Phase,
    conditions: &'static [Condition],
}

/// Builds the status reported for the current parent generation.
pub(super) fn render_status(session_space: &SessionSpace, phase: Phase) -> Value {
    serde_json::to_value(Status {
        observed_generation: session_space.metadata.generation,
        phase,
        conditions: phase.conditions(),
    })
    .expect("serializing SessionSpace status cannot fail")
}
