import kubernetes

from ._identity import Identity, IdentityCrd


def lookup_identities_in_kubernetes(
    kubectl: kubernetes.client.CustomObjectsApi,
) -> dict[int, Identity]:
    current_crds = kubectl.list_cluster_custom_object(
        group=IdentityCrd.GROUP, version=IdentityCrd.VERSION, plural=IdentityCrd.PLURAL
    )
    current_state = {
        int(item["spec"].get("uid")): {
            "uid": int(item["spec"].get("uid")),
            "gid": int(item["spec"].get("gid")),
            "supplementalGroups": list(
                map(int, item["spec"].get("supplementalGroups", []))
            ),
        }
        for item in current_crds.get("items", [])
    }
    return current_state
