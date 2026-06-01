import logging

import jsonpatch
import kubernetes

from ._identity import Identity, IdentityCrd

_logger = logging.getLogger(__name__)


def sync_ldap_to_kubernetes(
    kubectl: kubernetes.client.CustomObjectsApi,
    ldap_data: dict[int, Identity],
    kubernetes_data: dict[int, Identity],
) -> None:
    desired_state = {
        str(uid_num): {
            "uid": uid_num,
            "gid": data["gid"],
            "supplementalGroups": data["supplementalGroups"],
        }
        for uid_num, data in ldap_data.items()
    }

    patch = jsonpatch.JsonPatch.from_diff(kubernetes_data, desired_state)

    if not patch:
        _logger.info("Cluster is fully in-sync with LDAP. No changes needed.")
        return

    _logger.info(
        "Applying %d updates to match desired LDAP state...",
        len(patch.patch),
    )

    for operation in patch.patch:
        op_type = operation["op"]  # 'add', 'remove', or 'replace'
        path_parts = operation["path"].strip("/").split("/")
        username = path_parts[0]  # The user ID string (e.g., "10023")

        if op_type == "add" and len(path_parts) == 1:
            body = {
                "apiVersion": f"{IdentityCrd.GROUP}/{IdentityCrd.VERSION}",
                "kind": "UserIdentity",
                "metadata": {"name": username},
                "spec": operation["value"],
            }
            kubectl.create_cluster_custom_object(
                IdentityCrd.GROUP, IdentityCrd.VERSION, IdentityCrd.PLURAL, body
            )

        elif op_type == "remove" and len(path_parts) == 1:
            kubectl.delete_cluster_custom_object(
                IdentityCrd.GROUP, IdentityCrd.VERSION, IdentityCrd.PLURAL, username
            )

        elif op_type in ("replace", "add"):
            # Update the entire spec for the user to keep API calls clean
            body = {
                "apiVersion": f"{IdentityCrd.GROUP}/{IdentityCrd.VERSION}",
                "kind": "UserIdentity",
                "metadata": {"name": username},
                "spec": desired_state[username],
            }
            kubectl.patch_cluster_custom_object(
                IdentityCrd.GROUP,
                IdentityCrd.VERSION,
                IdentityCrd.PLURAL,
                username,
                body,
            )
