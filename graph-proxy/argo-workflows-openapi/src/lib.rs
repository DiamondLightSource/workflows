#[allow(clippy::all)]
mod types;

use serde::Deserialize;
use std::{error::Error, fmt::Display};
pub use types::*;

impl Display for GrpcGatewayRuntimeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.message.as_deref().unwrap_or_default())
    }
}

impl Error for GrpcGatewayRuntimeError {}

#[derive(Debug, Deserialize)]
#[serde(untagged)]
pub enum APIResult<T> {
    Ok(T),
    Err(GrpcGatewayRuntimeError),
}

impl<T> APIResult<T> {
    pub fn into_result(self) -> Result<T, GrpcGatewayRuntimeError> {
        match self {
            Self::Ok(ok) => Ok(ok),
            Self::Err(err) => Err(err),
        }
    }
}

impl<T> From<APIResult<T>> for Result<T, GrpcGatewayRuntimeError> {
    fn from(value: APIResult<T>) -> Self {
        value.into_result()
    }
}
