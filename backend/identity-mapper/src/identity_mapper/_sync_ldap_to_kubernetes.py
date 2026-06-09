import logging

import kubernetes

from ._identity import Identity, IdentityCrd

_logger = logging.getLogger(__name__)


def sync_ldap_to_kubernetes(
    kubectl: kubernetes.client.CustomObjectsApi,
    ldap_data: dict[int, Identity],
    kubernetes_data: dict[int, Identity],
) -> None:
    ldap_users = set(ldap_data)
    kube_users = set(kubernetes_data)

    to_create = ldap_users - kube_users
    to_delete = kube_users - ldap_users
    to_update = {
        user
        for user in ldap_users & kube_users
        if ldap_data[user] != kubernetes_data[user]
    }

    total_ops = len(to_create) + len(to_delete) + len(to_update)

    if total_ops == 0:
        _logger.info("Cluster is fully in-sync with LDAP. No changes needed.")
        return

    _logger.info(
        "Applying %d changes (%d creates, %d deletes, %d updates)"
        " to match desired LDAP state...",
        total_ops,
        to_create,
        to_delete,
        to_update,
    )

    for username in to_create:
        body = {
            "apiVersion": f"{IdentityCrd.GROUP}/{IdentityCrd.VERSION}",
            "kind": "UserIdentity",
            "metadata": {"name": str(username)},
            "spec": ldap_data[username],
        }
        kubectl.create_cluster_custom_object(
            IdentityCrd.GROUP, IdentityCrd.VERSION, IdentityCrd.PLURAL, body
        )

    for username in to_delete:
        kubectl.delete_cluster_custom_object(
            IdentityCrd.GROUP, IdentityCrd.VERSION, IdentityCrd.PLURAL, str(username)
        )

    for username in to_update:
        body = {
            "apiVersion": f"{IdentityCrd.GROUP}/{IdentityCrd.VERSION}",
            "kind": "UserIdentity",
            "metadata": {"name": str(username)},
            "spec": ldap_data[username],
        }
        kubectl.patch_cluster_custom_object(
            IdentityCrd.GROUP,
            IdentityCrd.VERSION,
            IdentityCrd.PLURAL,
            str(username),
            body,
        )
