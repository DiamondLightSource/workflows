from typing import TypedDict

import jsonpatch
import kubernetes
import ldap3

_CRD_GROUP = "workflows.internal.diamond.ac.uk"
_CRD_VERSION = "v1"
_CRD_PLURAL = "useridentities"
_BASE_DN = "dc=diamond,dc=ac,dc=uk"


class Identity(TypedDict):
    uid: int
    gid: int
    supplementalGroups: list[int]


def lookup_identities_in_ldap(
    ldap: ldap3.Connection,
) -> dict[int, Identity]:
    people_base_dn = _BASE_DN
    group_base_dn = _BASE_DN

    user_filter = "(objectClass=posixAccount)"

    ldap.search(
        people_base_dn,
        user_filter,
        attributes=["uid", "uidNumber", "gidNumber"],
    )

    users: list[tuple[int, str, int]] = []
    usernames: set[str] = set()
    primary_gids: set[int] = set()

    for e in ldap.entries:
        if not (e.uid.value and e.uidNumber.value and e.gidNumber.value):
            continue
        uid_num = int(e.uidNumber.value)
        username = str(e.uid.value)
        gid_num = int(e.gidNumber.value)

        users.append((uid_num, username, gid_num))
        usernames.add(username)
        primary_gids.add(gid_num)

    if not users:
        return {}

    ldap.search(
        group_base_dn,
        "(objectClass=posixGroup)",
        attributes=["cn", "gidNumber", "memberUid"],
    )

    gid_to_cn: dict[int, str] = {}
    user_to_groups: dict[str, list[int]] = {u: [] for u in usernames}

    for g in ldap.entries:
        if not (g.cn.value and g.gidNumber.value):
            continue

        cn = str(g.cn.value)
        gid = int(g.gidNumber.value)

        gid_to_cn.setdefault(gid, cn)

        members = []
        try:
            members = list(getattr(g.memberUid, "values", []) or [])
        except Exception:
            members = []

        for m in members:
            mu = str(m)
            if mu in user_to_groups:
                user_to_groups[mu].append({"name": cn, "gid": gid})

    out = {}
    for uid_num, username, primary_gid in users:
        supplementary = []
        for grp in user_to_groups.get(username, []):
            # exclude "supplementary" group that is actually the user's primary gid
            if grp["gid"] != primary_gid:
                supplementary.append(grp["gid"])
        supplementary.sort()
        out[uid_num] = {
            "uid": uid_num,
            "gid": primary_gid,
            "supplementalGroups": supplementary,
        }

    return out


def get_kubernetes_client() -> kubernetes.client.CustomObjectsApi:
    try:
        kubernetes.config.load_incluster_config()
    except kubernetes.config.ConfigException:
        kubernetes.config.load_kube_config()
    custom_api = kubernetes.client.CustomObjectsApi()
    return custom_api


def lookup_identities_in_kubernetes(
    kubectl: kubernetes.client.CustomObjectsApi,
) -> dict[int, Identity]:
    kubernetes
    current_crds = kubectl.list_cluster_custom_object(
        group=_CRD_GROUP, version=_CRD_VERSION, plural=_CRD_PLURAL
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
        print("Cluster is fully in-sync with LDAP. No changes needed.")
        return

    print(f"Applying {len(patch.patch)} updates to match desired LDAP state...")

    for operation in patch.patch:
        op_type = operation["op"]  # 'add', 'remove', or 'replace'
        path_parts = operation["path"].strip("/").split("/")
        username = path_parts[0]  # The user ID string (e.g., "10023")

        if op_type == "add" and len(path_parts) == 1:
            body = {
                "apiVersion": f"{_CRD_GROUP}/{_CRD_VERSION}",
                "kind": "UserProfile",
                "metadata": {"name": username},
                "spec": operation["value"],
            }
            kubectl.create_cluster_custom_object(
                _CRD_GROUP, _CRD_VERSION, _CRD_PLURAL, body
            )

        elif op_type == "remove" and len(path_parts) == 1:
            kubectl.delete_cluster_custom_object(
                _CRD_GROUP, _CRD_VERSION, _CRD_PLURAL, username
            )

        elif op_type in ("replace", "add"):
            # Update the entire spec for the user to keep API calls clean
            body = {
                "apiVersion": f"{_CRD_GROUP}/{_CRD_VERSION}",
                "kind": "UserProfile",
                "metadata": {"name": username},
                "spec": desired_state[username],
            }
            kubectl.patch_cluster_custom_object(
                _CRD_GROUP, _CRD_VERSION, _CRD_PLURAL, username, body
            )


def _main() -> None:
    ldap_server: str = "ldap://ldapmaster.diamond.ac.uk"
    server = ldap3.Server(ldap_server)
    ldap = ldap3.Connection(server, auto_bind=True)
    kubectl = get_kubernetes_client()
    ldap_identities = lookup_identities_in_ldap(ldap)
    kubernetes_identities = lookup_identities_in_kubernetes(kubectl)
    sync_ldap_to_kubernetes(kubectl, ldap_identities, kubernetes_identities)


if __name__ == "__main__":
    _main()
