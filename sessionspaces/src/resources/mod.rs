/// The config map for kyverno policy
mod config_maps;
/// The Namespace for a beamline session
mod namespace;

pub use self::{
    config_maps::create_configmap,
    namespace::{create_namespace, delete_namespace},
};
