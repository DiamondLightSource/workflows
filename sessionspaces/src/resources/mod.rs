/// The Namespace for a beamline session
mod namespace;
/// The argo-workflows ServiceAccount and corresponding Role
mod workflows_sa;

pub use self::{
    namespace::{create_namespace, delete_namespace},
    workflows_sa::{create_argo_workflows_role, create_argo_workflows_service_account},
};
