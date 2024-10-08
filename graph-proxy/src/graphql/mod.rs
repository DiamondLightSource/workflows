/// GraphQL operations related to workflow templates
mod workflow_templates;
/// GraphQL operations related to workflows
mod workflows;

use self::{workflow_templates::WorkflowTemplatesQuery, workflows::WorkflowsQuery};
use async_graphql::{EmptyMutation, EmptySubscription, MergedObject, Schema, SchemaBuilder};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::extract::State;
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};
use lazy_static::lazy_static;

/// The root schema of the service
pub type RootSchema = Schema<Query, EmptyMutation, EmptySubscription>;

/// A schema builder for the service
pub fn root_schema_builder() -> SchemaBuilder<Query, EmptyMutation, EmptySubscription> {
    Schema::build(Query::default(), EmptyMutation, EmptySubscription).enable_federation()
}

/// The root query of the service
#[derive(Debug, Clone, Default, MergedObject)]
pub struct Query(WorkflowsQuery, WorkflowTemplatesQuery);

/// Handles HTTP requests as GraphQL according to the provided [`Schema`]
pub async fn graphql_handler(
    State(schema): State<RootSchema>,
    auth_token_header: Option<TypedHeader<Authorization<Bearer>>>,
    request: GraphQLRequest,
) -> GraphQLResponse {
    let auth_token = auth_token_header.map(|header| header.0);
    schema
        .execute(request.into_inner().data(auth_token))
        .await
        .into()
}

lazy_static! {
    pub(self) static ref CLIENT: reqwest::Client = reqwest::Client::new();
}
