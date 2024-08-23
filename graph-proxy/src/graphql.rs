use async_graphql::{EmptyMutation, EmptySubscription, MergedObject, Schema, SchemaBuilder};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::extract::State;
use axum_extra::{
    headers::{authorization::Bearer, Authorization},
    TypedHeader,
};

/// The root schema of the service
pub type RootSchema = Schema<Query, EmptyMutation, EmptySubscription>;

/// A schema builder for the service
pub fn root_schema_builder() -> SchemaBuilder<Query, EmptyMutation, EmptySubscription> {
    Schema::build(Query, EmptyMutation, EmptySubscription).enable_federation()
}

/// The root query of the service
#[derive(Debug, Clone, Default, MergedObject)]
pub struct Query;

/// Handles HTTP requests as GraphQL according to the provided [`Schema`]
pub async fn graphql_handler(
    State(schema): State<RootSchema>,
    TypedHeader(auth_token): TypedHeader<Authorization<Bearer>>,
    request: GraphQLRequest,
) -> GraphQLResponse {
    schema
        .execute(request.into_inner().data(auth_token))
        .await
        .into()
}
