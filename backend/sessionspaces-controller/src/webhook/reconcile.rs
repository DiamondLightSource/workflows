use serde_json::{Map, Value, json};

use super::status::{Phase, render_status};
use super::types::{SessionSpace, SyncRequest, SyncResponse};
use crate::sessionspace::DesiredState;

/// Computes the desired children and status for one synchronization request.
pub fn reconcile(request: SyncRequest) -> SyncResponse {
    let name = request.parent.metadata.name.clone();

    match &request.parent.spec.desired_state {
        DesiredState::Active => reconcile_active(&name, &request),

        DesiredState::Dormant => reconcile_dormant(&name, &request),
    }
}

fn reconcile_active(name: &str, request: &SyncRequest) -> SyncResponse {
    let namespace = render_namespace(name);

    if !namespace_exists(name, &request.children) {
        return SyncResponse {
            children: vec![namespace],
            status: Some(render_status(&request.parent, Phase::Activating)),
        };
    }

    let desired_children = vec![
        namespace,
        render_config_map(name, &request.parent),
        render_service_account(name),
        render_argo_workflow_role_binding(name),
        render_visit_member_role_binding(name, &request.parent),
        render_local_queue(name),
    ];

    let ready = all_required_children_exist(name, &request.children);

    let status = if ready {
        render_status(&request.parent, Phase::Active)
    } else {
        render_status(&request.parent, Phase::Activating)
    };

    SyncResponse {
        children: desired_children,
        status: Some(status),
    }
}

fn reconcile_dormant(name: &str, request: &SyncRequest) -> SyncResponse {
    let children_remaining = has_any_children(&request.children);

    if children_remaining {
        tracing::info!(sessionspace = name, "deactivating sessionspace");

        return SyncResponse {
            children: vec![],
            status: Some(render_status(&request.parent, Phase::Deactivating)),
        };
    }

    tracing::info!(sessionspace = name, "sessionspace is dormant");

    SyncResponse {
        children: vec![],
        status: Some(render_status(&request.parent, Phase::Dormant)),
    }
}

fn namespace_exists(name: &str, children: &Value) -> bool {
    children
        .get("Namespace.v1")
        .and_then(|namespaces| namespaces.get(name))
        .is_some()
}

fn render_namespace(name: &str) -> Value {
    json!({
        "apiVersion": "v1",
        "kind": "Namespace",
        "metadata": {
            "name": name,
            "labels": {
                "app.kubernetes.io/managed-by": "sessionspaces"
            }
        }
    })
}

fn render_config_map(namespace: &str, session_space: &SessionSpace) -> Value {
    let session = &session_space.spec.session;
    let storage = &session_space.spec.storage;
    let access = &session_space.spec.access;
    let (proposal_code, proposal_number) = split_proposal(&session.proposal);

    let data = Map::from_iter([
        (
            "proposal_code".to_string(),
            Value::String(proposal_code.to_string()),
        ),
        (
            "proposal_number".to_string(),
            Value::String(proposal_number.to_string()),
        ),
        (
            "visit".to_string(),
            Value::String(session.visit.to_string()),
        ),
        (
            "instrument".to_string(),
            Value::String(session.instrument.clone()),
        ),
        (
            "members".to_string(),
            Value::String(
                serde_json::to_string(&access.members).expect("serializing members cannot fail"),
            ),
        ),
        (
            "start_date".to_string(),
            Value::String(session.start_date.clone()),
        ),
        (
            "end_date".to_string(),
            Value::String(session.end_date.clone()),
        ),
        ("gid".to_string(), Value::String(storage.gid.to_string())),
        (
            "data_directory".to_string(),
            Value::String(storage.data_directory.clone()),
        ),
    ]);

    json!({
        "apiVersion": "v1",
        "kind": "ConfigMap",
        "metadata": {
            "name": "sessionspaces",
            "namespace": namespace,
            "labels": {
                "app.kubernetes.io/managed-by": "sessionspaces",
                "workflows.argoproj.io/configmap-type": "Parameter"
            }
        },
        "data": data
    })
}

fn render_service_account(namespace: &str) -> Value {
    json!({
        "apiVersion": "v1",
        "kind": "ServiceAccount",
        "metadata": {
            "name": "argo-workflow",
            "namespace": namespace,
            "labels": {
                "app.kubernetes.io/managed-by": "sessionspaces"
            }
        }
    })
}

fn render_argo_workflow_role_binding(namespace: &str) -> Value {
    json!({
        "apiVersion": "rbac.authorization.k8s.io/v1",
        "kind": "RoleBinding",
        "metadata": {
            "name": "argo-workflow",
            "namespace": namespace,
            "labels": {
                "app.kubernetes.io/managed-by": "sessionspaces"
            }
        },
        "subjects": [
            {
                "kind": "ServiceAccount",
                "name": "argo-workflow",
                "namespace": namespace
            }
        ],
        "roleRef": {
            "apiGroup": "rbac.authorization.k8s.io",
            "kind": "ClusterRole",
            "name": "argo-workflow"
        }
    })
}

fn render_visit_member_role_binding(namespace: &str, session_space: &SessionSpace) -> Value {
    let subjects = session_space
        .spec
        .access
        .members
        .iter()
        .map(|member| {
            json!({
                "apiGroup": "rbac.authorization.k8s.io",
                "kind": "User",
                "name": format!("oidc:{member}")
            })
        })
        .collect::<Vec<_>>();

    json!({
        "apiVersion": "rbac.authorization.k8s.io/v1",
        "kind": "RoleBinding",
        "metadata": {
            "name": "visit-member",
            "namespace": namespace,
            "labels": {
                "app.kubernetes.io/managed-by": "sessionspaces"
            }
        },
        "subjects": subjects,
        "roleRef": {
            "apiGroup": "rbac.authorization.k8s.io",
            "kind": "ClusterRole",
            "name": "visit-member"
        }
    })
}

fn render_local_queue(namespace: &str) -> Value {
    json!({
        "apiVersion": "kueue.x-k8s.io/v1beta2",
        "kind": "LocalQueue",
        "metadata": {
            "name": "default-queue",
            "namespace": namespace,
            "labels": {
                "app.kubernetes.io/managed-by": "sessionspaces"
            }
        },
        "spec": {
            "clusterQueue": "default-queue"
        }
    })
}

fn all_required_children_exist(namespace: &str, children: &Value) -> bool {
    child_exists(
        children,
        "ConfigMap.v1",
        &format!("{namespace}/sessionspaces"),
    ) && child_exists(
        children,
        "ServiceAccount.v1",
        &format!("{namespace}/argo-workflow"),
    ) && child_exists(
        children,
        "RoleBinding.rbac.authorization.k8s.io/v1",
        &format!("{namespace}/visit-member"),
    ) && child_exists(
        children,
        "RoleBinding.rbac.authorization.k8s.io/v1",
        &format!("{namespace}/argo-workflow"),
    ) && child_exists(
        children,
        "LocalQueue.kueue.x-k8s.io/v1beta2",
        &format!("{namespace}/default-queue"),
    )
}

fn child_exists(children: &Value, kind_key: &str, object_key: &str) -> bool {
    children
        .get(kind_key)
        .and_then(|objects| objects.get(object_key))
        .is_some()
}

fn has_any_children(children: &Value) -> bool {
    children
        .as_object()
        .map(|groups| {
            groups
                .values()
                .any(|group| group.as_object().is_some_and(|objects| !objects.is_empty()))
        })
        .unwrap_or(false)
}

fn split_proposal(proposal: &str) -> (&str, &str) {
    let number_start = proposal
        .char_indices()
        .find_map(|(index, character)| character.is_ascii_digit().then_some(index))
        .unwrap_or(proposal.len());

    proposal.split_at(number_start)
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use super::{DesiredState, SyncRequest, reconcile};

    fn request(children: Value) -> SyncRequest {
        serde_json::from_value(json!({
            "parent": {
                "metadata": {
                    "name": "mx12345-1",
                    "generation": 2
                },
                "spec": {
                    "desiredState": "Active",
                    "session": {
                        "proposal": "mx12345",
                        "visit": 1,
                        "instrument": "i03",
                        "startDate": "2026-08-24 09:00:00",
                        "endDate": "2026-08-25 17:00:00"
                    },
                    "storage": {
                        "dataDirectory": "/dls/i03/data/2026/mx12345-1",
                        "gid": 12345
                    },
                    "access": {
                        "members": ["alice", "bob"]
                    }
                }
            },
            "children": children
        }))
        .unwrap()
    }

    fn all_children() -> Value {
        json!({
            "Namespace.v1": {
                "mx12345-1": {}
            },
            "ConfigMap.v1": {
                "mx12345-1/sessionspaces": {}
            },
            "ServiceAccount.v1": {
                "mx12345-1/argo-workflow": {}
            },
            "RoleBinding.rbac.authorization.k8s.io/v1": {
                "mx12345-1/argo-workflow": {},
                "mx12345-1/visit-member": {}
            },
            "LocalQueue.kueue.x-k8s.io/v1beta2": {
                "mx12345-1/default-queue": {}
            }
        })
    }

    #[test]
    fn requests_only_the_namespace_until_it_is_observed() {
        let response = reconcile(request(json!({})));

        assert_eq!(
            response.children,
            vec![json!({
                "apiVersion": "v1",
                "kind": "Namespace",
                "metadata": {
                    "name": "mx12345-1",
                    "labels": {
                        "app.kubernetes.io/managed-by": "sessionspaces"
                    }
                }
            })]
        );
    }

    #[test]
    fn renders_the_sessionspaces_config_map_contract() {
        let response = reconcile(request(json!({
            "Namespace.v1": {
                "mx12345-1": {}
            }
        })));

        let config_map = &response.children[1];
        assert_eq!(config_map["metadata"]["name"], "sessionspaces");
        assert_eq!(config_map["metadata"]["namespace"], "mx12345-1");
        assert_eq!(
            config_map["data"],
            json!({
                "proposal_code": "mx",
                "proposal_number": "12345",
                "visit": "1",
                "instrument": "i03",
                "members": "[\"alice\",\"bob\"]",
                "start_date": "2026-08-24 09:00:00",
                "end_date": "2026-08-25 17:00:00",
                "gid": "12345",
                "data_directory": "/dls/i03/data/2026/mx12345-1"
            })
        );
    }

    #[test]
    fn renders_the_namespace_resources() {
        let response = reconcile(request(json!({
            "Namespace.v1": {
                "mx12345-1": {}
            }
        })));

        assert_eq!(response.children.len(), 6);
        assert_eq!(
            response.children[2],
            json!({
                "apiVersion": "v1",
                "kind": "ServiceAccount",
                "metadata": {
                    "name": "argo-workflow",
                    "namespace": "mx12345-1",
                    "labels": {
                        "app.kubernetes.io/managed-by": "sessionspaces"
                    }
                }
            })
        );
        assert_eq!(
            response.children[3],
            json!({
                "apiVersion": "rbac.authorization.k8s.io/v1",
                "kind": "RoleBinding",
                "metadata": {
                    "name": "argo-workflow",
                    "namespace": "mx12345-1",
                    "labels": {
                        "app.kubernetes.io/managed-by": "sessionspaces"
                    }
                },
                "subjects": [
                    {
                        "kind": "ServiceAccount",
                        "name": "argo-workflow",
                        "namespace": "mx12345-1"
                    }
                ],
                "roleRef": {
                    "apiGroup": "rbac.authorization.k8s.io",
                    "kind": "ClusterRole",
                    "name": "argo-workflow"
                }
            })
        );
        assert_eq!(
            response.children[4],
            json!({
                "apiVersion": "rbac.authorization.k8s.io/v1",
                "kind": "RoleBinding",
                "metadata": {
                    "name": "visit-member",
                    "namespace": "mx12345-1",
                    "labels": {
                        "app.kubernetes.io/managed-by": "sessionspaces"
                    }
                },
                "subjects": [
                    {
                        "apiGroup": "rbac.authorization.k8s.io",
                        "kind": "User",
                        "name": "oidc:alice"
                    },
                    {
                        "apiGroup": "rbac.authorization.k8s.io",
                        "kind": "User",
                        "name": "oidc:bob"
                    }
                ],
                "roleRef": {
                    "apiGroup": "rbac.authorization.k8s.io",
                    "kind": "ClusterRole",
                    "name": "visit-member"
                }
            })
        );
        assert_eq!(
            response.children[5],
            json!({
                "apiVersion": "kueue.x-k8s.io/v1beta2",
                "kind": "LocalQueue",
                "metadata": {
                    "name": "default-queue",
                    "namespace": "mx12345-1",
                    "labels": {
                        "app.kubernetes.io/managed-by": "sessionspaces"
                    }
                },
                "spec": {
                    "clusterQueue": "default-queue"
                }
            })
        );
    }

    #[test]
    fn reports_active_when_all_required_children_are_observed() {
        let response = reconcile(request(all_children()));

        assert_eq!(
            response.status,
            Some(json!({
                "observedGeneration": 2,
                "phase": "Active",
                "conditions": [
                    {
                        "type": "Ready",
                        "status": "True",
                        "reason": "ResourcesReady",
                        "message": "All SessionSpace resources are ready"
                    },
                    {
                        "type": "Dormant",
                        "status": "False",
                        "reason": "ResourcesPresent",
                        "message": "SessionSpace resources are materialized"
                    }
                ]
            }))
        );
    }

    #[test]
    fn reports_activating_when_a_required_child_is_missing() {
        let mut children = all_children();
        children["RoleBinding.rbac.authorization.k8s.io/v1"]
            .as_object_mut()
            .unwrap()
            .remove("mx12345-1/visit-member");

        let response = reconcile(request(children));

        assert_eq!(
            response.status,
            Some(json!({
                "observedGeneration": 2,
                "phase": "Activating",
                "conditions": [
                    {
                        "type": "Ready",
                        "status": "False",
                        "reason": "Reconciling",
                        "message": "Waiting for SessionSpace resources to become ready"
                    },
                    {
                        "type": "Dormant",
                        "status": "False",
                        "reason": "ResourcesPresent",
                        "message": "SessionSpace is being materialized"
                    }
                ]
            }))
        );
    }

    #[test]
    fn reports_deactivating_while_children_remain() {
        let mut request = request(all_children());
        request.parent.spec.desired_state = DesiredState::Dormant;

        let response = reconcile(request);

        assert!(response.children.is_empty());
        assert_eq!(
            response.status,
            Some(json!({
                "observedGeneration": 2,
                "phase": "Deactivating",
                "conditions": [
                    {
                        "type": "Ready",
                        "status": "False",
                        "reason": "Deactivating",
                        "message": "SessionSpace is not ready while resources are being removed"
                    },
                    {
                        "type": "Dormant",
                        "status": "False",
                        "reason": "RemovingResources",
                        "message": "Waiting for SessionSpace resources to be removed"
                    }
                ]
            }))
        );
    }

    #[test]
    fn reports_dormant_when_all_children_are_removed() {
        let mut request = request(json!({}));
        request.parent.spec.desired_state = DesiredState::Dormant;

        let response = reconcile(request);

        assert!(response.children.is_empty());
        assert_eq!(
            response.status,
            Some(json!({
                "observedGeneration": 2,
                "phase": "Dormant",
                "conditions": [
                    {
                        "type": "Ready",
                        "status": "False",
                        "reason": "Dormant",
                        "message": "SessionSpace is dormant and cannot accept workflows"
                    },
                    {
                        "type": "Dormant",
                        "status": "True",
                        "reason": "ResourcesRemoved",
                        "message": "All SessionSpace resources have been removed"
                    }
                ]
            }))
        );
    }
}
