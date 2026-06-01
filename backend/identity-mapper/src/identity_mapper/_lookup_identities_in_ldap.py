import ldap3

from ._identity import Identity

_BASE_DN = "dc=diamond,dc=ac,dc=uk"


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

        member_uid = getattr(g, "memberUid", None)
        values = getattr(member_uid, "values", None)
        members = list(values) if values else []

        for m in members:
            mu = str(m)
            if mu in user_to_groups:
                user_to_groups[mu].append({"name": cn, "gid": gid})

    out = {}
    for uid_num, username, primary_gid in users:
        supplementary = [
            grp["gid"]
            for grp in user_to_groups.get(username, [])
            if grp["gid"] != primary_gid
        ]
        supplementary.sort()
        out[uid_num] = {
            "uid": uid_num,
            "gid": primary_gid,
            "supplementalGroups": supplementary,
        }

    return out
