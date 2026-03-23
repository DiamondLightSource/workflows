/// The ConfigMap describing the session
mod config_map;
/// The Namespace for a beamline session
mod namespace;

/// The app.kubernetes.io/managed-by label
const MANAGED_BY_LABEL: &str = "app.kubernetes.io/managed-by";
/// The value to be used in app.kubernetes.io/managed-by labels
const MANAGED_BY: &str = "sessionspaces";

pub use self::{
    config_map::create_configmap,
    namespace::{create_namespace, delete_namespace},
};
