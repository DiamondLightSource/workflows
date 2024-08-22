use async_graphql::{EmptyMutation, EmptySubscription, MergedObject, Schema, SchemaBuilder};

/// A schema builder for the service
pub fn root_schema_builder() -> SchemaBuilder<Query, EmptyMutation, EmptySubscription> {
    Schema::build(Query, EmptyMutation, EmptySubscription).enable_federation()
}

/// The root query of the service
#[derive(Debug, Clone, Default, MergedObject)]
pub struct Query;
