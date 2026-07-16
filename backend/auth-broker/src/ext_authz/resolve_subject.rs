use k8s_openapi::api::core::v1::Pod;

use crate::k8s::K8sApi;

use super::authz_error::AuthzError;

pub async fn resolve_subject(k8s: &dyn K8sApi, pod: &Pod) -> Result<String, AuthzError> {
    let pod_namespace = pod.metadata.namespace.as_deref().unwrap_or("default");
    let pod_name = pod.metadata.name.as_deref().unwrap_or("");

    let workflow_name = pod
        .metadata
        .labels
        .as_ref()
        .and_then(|l| l.get("workflows.argoproj.io/workflow"))
        .ok_or_else(|| {
            AuthzError::SubjectResolution(format!(
                "label workflows.argoproj.io/workflow missing on pod \
                 {pod_namespace}/{pod_name}"
            ))
        })?;

    let workflow = k8s
        .get_workflow(pod_namespace, workflow_name)
        .await
        .map_err(|e| {
            AuthzError::SubjectResolution(format!(
                "failed to get workflow {pod_namespace}/{workflow_name}: {e}"
            ))
        })?;

    let creator = workflow
        .metadata
        .labels
        .as_ref()
        .and_then(|l| l.get("workflows.argoproj.io/creator"))
        .ok_or_else(|| {
            AuthzError::SubjectResolution(format!(
                "label workflows.argoproj.io/creator missing on workflow \
                 {pod_namespace}/{workflow_name}"
            ))
        })?;

    Ok(creator.clone())
}
