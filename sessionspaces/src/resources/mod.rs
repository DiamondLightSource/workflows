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
use crate::permissionables::Sessions;
use std::collections::BTreeSet;
use tracing::{info, instrument};

/// Requests a new bundle from the bundle server and performs templating accordingly
#[instrument(skip_all, err(level=tracing::Level::WARN))]
pub async fn update_resources(
    k8s_client: kube::Client,
    current_sessions: &Sessions,
    new_sessions: &Sessions,
) -> std::result::Result<(), anyhow::Error> {
    let current_session_names = current_sessions.keys().cloned().collect::<BTreeSet<_>>();
    let session_names = new_sessions.keys().cloned().collect::<BTreeSet<_>>();
    let to_update = current_session_names
        .union(&session_names)
        .collect::<BTreeSet<_>>();

    info!("Updating {} SessionSpaces", to_update.len());
    for namespace in to_update.into_iter() {
        let session_info = new_sessions.get(namespace);
        let current_sesssion_info = current_sessions.get(namespace);
        match (current_sesssion_info, session_info) {
            (Some(_), None) => {
                info!("Deleting Namespace: {}", namespace);
                delete_namespace(namespace, k8s_client.clone()).await?;
            }
            (None, Some(session_info)) => {
                info!(
                    "Creating Namespace, {}, with Config: {}",
                    namespace, session_info
                );
                create_namespace(namespace.clone(), k8s_client.clone()).await?;
                create_configmap(namespace, session_info.clone(), k8s_client.clone()).await?;
            }
            (Some(current_info), Some(session_info)) if current_info != session_info => {
                info!(
                    "Updating Namespace, {}, with Config: {}",
                    namespace, session_info
                );
                create_configmap(namespace, session_info.clone(), k8s_client.clone()).await?;
            }
            (_, _) => {}
        }
    }
    Ok(())
}
