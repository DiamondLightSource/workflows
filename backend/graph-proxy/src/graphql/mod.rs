/// Workflow Template Paramer Schema
mod parameter_schema;
/// Workflow Template JSON Forms UI Schema
mod ui_schema;
/// GraphQL operations related to workflow templates
mod workflow_templates;
/// GraphQL operations related to workflows
mod workflows;

/// Workflow/Template filters
mod filters;
/// GraphQL operations requiring subscriptions
mod subscription;
/// Axum-specific websocket handling to support subscriptions
pub mod subscription_integration;

use crate::RouterState;

use self::{
    subscription::WorkflowsSubscription,
    workflow_templates::WorkflowTemplatesQuery,
    workflows::{Workflow, WorkflowsQuery},
};
use async_graphql::{
    parser::parse_query, Context, InputObject, MergedObject, MergedSubscription, Object, Schema,
    SchemaBuilder, SimpleObject, Union, ID,
};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::extract::State;
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use lazy_static::lazy_static;
use opentelemetry::KeyValue;
use std::fmt::Display;
use workflow_templates::WorkflowTemplatesMutation;

/// The root schema of the service
pub type RootSchema = Schema<Query, Mutation, Subscription>;

/// A schema builder for the service
pub fn root_schema_builder() -> SchemaBuilder<Query, Mutation, Subscription> {
    Schema::build(
        Query::default(),
        Mutation::default(),
        Subscription::default(),
    )
    .enable_federation()
}

/// The root query of the service
#[derive(Debug, Clone, Default, MergedObject)]
pub struct Query(NodeQuery, WorkflowsQuery, WorkflowTemplatesQuery);

/// Provides Relay node resolver for fetching any Node by ID.
#[derive(Debug, Clone, Default)]
pub struct NodeQuery;

#[Object]
impl NodeQuery {
    async fn node(&self, ctx: &Context<'_>, id: ID) -> Option<NodeValue> {
        let id_str = id.to_string();
        let parts: Vec<&str> = id_str.split(':').collect();
        if parts.len() != 2 {
            return None;
        }
        let visit_display = parts[0];
        let workflow_name = parts[1];

        let visit_input = match parse_visit_display(visit_display) {
            Some(v) => v,
            None => return None,
        };

        let workflows_query = WorkflowsQuery;
        match workflows_query
            .workflow(ctx, visit_input, workflow_name.to_string())
            .await
        {
            Ok(workflow) => Some(NodeValue::Workflow(workflow)),
            Err(_) => None,
        }
    }
}

/// Helper to parse VisitInput Display back into VisitInput
fn parse_visit_display(display: &str) -> Option<VisitInput> {
    let re = regex::Regex::new(r"^([A-Za-z]+)(\d+)-(\d+)$").ok()?;
    let caps = re.captures(display)?;
    Some(VisitInput {
        proposal_code: caps[1].to_string(),
        proposal_number: caps[2].parse().ok()?,
        number: caps[3].parse().ok()?,
    })
}

/// The root mutation of the service
#[derive(Debug, Clone, Default, MergedObject)]
pub struct Mutation(WorkflowTemplatesMutation);

/// Represents Relay Node types
#[derive(Union)]
enum NodeValue {
    /// A workflow node.
    Workflow(Workflow),
}

/// The root mutation of the service
#[derive(Debug, Clone, Default, MergedSubscription)]
pub struct Subscription(WorkflowsSubscription);

/// Handles HTTP requests as GraphQL according to the provided [`Schema`]
pub async fn graphql_handler(
    State(state): State<RouterState>,
    auth_token_header: Option<TypedHeader<Authorization<Bearer>>>,
    request: GraphQLRequest,
) -> GraphQLResponse {
    let start = std::time::Instant::now();
    let query = request.into_inner();
    let mut request_type = "unparseable";

    if let Ok(query) = parse_query(&query.query) {
        let operation = query.operations;

        let operations = match operation {
            async_graphql::parser::types::DocumentOperations::Single(operation) => {
                vec![operation.node.ty]
            }
            async_graphql::parser::types::DocumentOperations::Multiple(operation) => operation
                .iter()
                .map(|operation| operation.1.node.ty)
                .collect(),
        };
        let mut has_mutation = false;
        for operation in operations {
            match operation {
                async_graphql::parser::types::OperationType::Query => state
                    .metrics_state
                    .total_requests
                    .add(1, &[KeyValue::new("request_type", "query")]),
                async_graphql::parser::types::OperationType::Mutation => {
                    has_mutation = true;
                    state
                        .metrics_state
                        .total_requests
                        .add(1, &[KeyValue::new("request_type", "mutation")])
                }
                async_graphql::parser::types::OperationType::Subscription => {}
            };
        }
        request_type = if has_mutation { "mutation" } else { "query" };
    } else {
        state
            .metrics_state
            .total_requests
            .add(1, &[KeyValue::new("request_type", "unparseable")]);
    };

    let auth_token = auth_token_header.map(|header| header.0);
    state.schema.execute(query.data(auth_token)).await.into();
    let response = state.schema.execute(query.data(auth_token)).await;
    let elapsed_ms = start.elapsed().as_secs_f64() * 1000.0;
    let status = if response.errors.is_empty() {
        "ok"
    } else {
        "error"
    };
    state.metrics_state.request_duration_ms.record(
        elapsed_ms,
        &[
            KeyValue::new("request_type", request_type),
            KeyValue::new("status", status),
        ],
    );
    response.into()
}

lazy_static! {
    pub(self) static ref CLIENT: reqwest::Client = reqwest::Client::new();
}

/// A visit to an instrument as part of a session
#[derive(Debug, Clone, SimpleObject)]
struct Visit {
    /// Project Proposal Code
    proposal_code: String,
    /// Project Proposal Number
    proposal_number: u32,
    /// Session visit Number
    number: u32,
}

impl Display for Visit {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}{}-{}",
            self.proposal_code, self.proposal_number, self.number
        )
    }
}

/// A visit to an instrument as part of a session
#[derive(Debug, Clone, InputObject)]
pub struct VisitInput {
    /// Project Proposal Code
    pub proposal_code: String,
    /// Project Proposal Number
    pub proposal_number: u32,
    /// Session visit Number
    pub number: u32,
}

impl From<VisitInput> for Visit {
    fn from(visit: VisitInput) -> Self {
        Self {
            proposal_code: visit.proposal_code,
            proposal_number: visit.proposal_number,
            number: visit.number,
        }
    }
}

impl Display for VisitInput {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "{}{}-{}",
            self.proposal_code, self.proposal_number, self.number
        )
    }
}
