from ldap3 import MOCK_SYNC, Connection, Server

from identity_mapper._lookup_identities_in_ldap import lookup_identities_in_ldap


def _mock_ldap_connection() -> Connection:
    server = Server("mock")

    conn = Connection(server, client_strategy=MOCK_SYNC)
    conn.bind()

    base = "dc=diamond,dc=ac,dc=uk"

    conn.strategy.add_entry(
        "uid=mok12345,ou=people," + base,
        {
            "objectClass": ["posixAccount"],
            "uid": "mok12345",
            "uidNumber": "1",
            "gidNumber": "2",
        },
    )

    conn.strategy.add_entry(
        "cn=mok12345,ou=groups," + base,
        {
            "objectClass": ["posixGroup"],
            "cn": "mok12345",
            "gidNumber": "2",
        },
    )

    conn.strategy.add_entry(
        "cn=dls_dasc,ou=groups," + base,
        {
            "objectClass": ["posixGroup"],
            "cn": "sup_group_3",
            "gidNumber": "3",
            "memberUid": ["mok12345"],
        },
    )

    conn.strategy.add_entry(
        "cn=dls_staff,ou=groups," + base,
        {
            "objectClass": ["posixGroup"],
            "cn": "sup_group_4",
            "gidNumber": "4",
            "memberUid": ["mok12345"],
        },
    )

    return conn


def test_lookup_identities_in_ldap() -> None:
    ldap = _mock_ldap_connection()
    actual = lookup_identities_in_ldap(ldap)

    expected = {1: {"uid": 1, "gid": 2, "supplementalGroups": [3, 4]}}
    assert actual == expected
