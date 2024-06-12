/// The config map for kyverno policy
mod config_maps;
/// The Namespace for a beamline session
mod namespace;

/// The app.kubernetes.io/managed-by label
const MANAGED_BY_LABEL: &str = "app.kubernetes.io/managed-by";
/// The value to be used in app.kubernetes.io/managed-by labels
const MANAGED_BY: &str = "sessionspaces";

pub use self::{
    config_maps::create_configmap,
    namespace::{create_namespace, delete_namespace},
};
