use async_graphql::{Enum, InputObject};

#[derive(Debug, InputObject)]
#[allow(clippy::missing_docs_in_private_items)]
pub struct StringFilterInputV2 {
    /// Will filter to items where the `String` field is a member of the provided value
    r#in: Option<Vec<String>>,
    /// Will filter to items where the `String` field is equal to the provided value
    equal_to: Option<String>,
    /// Will filter to items where the `String` field is not equal to the provided value
    not_equal_to: Option<String>,
    /// Will filter to items where the `String` field is not a member of the provided value
    not_in: Option<Vec<String>>,
    /// Will filter to items where the `String` field is contains the provided value
    contains: Option<String>,
}

#[derive(Debug, Enum, Copy, Clone, Eq, PartialEq)]
#[allow(clippy::missing_docs_in_private_items)]
pub enum SortOrder {
    Asc,
    Desc,
}
