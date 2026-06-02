from unittest.mock import Mock

import kubernetes.client

from identity_mapper._identity import IdentityCrd
from identity_mapper._lookup_identities_in_kubernetes import (
    lookup_identities_in_kubernetes,
)


def test_lookup_identities_in_kubernetes() -> None:
    mock_kubectl = Mock(spec=kubernetes.client.CustomObjectsApi)
    mock_kubectl.list_cluster_custom_object.return_value = {
        "items": [
            {
                "metadata": {"name": "1001"},
                "spec": {
                    "uid": 1001,
                    "gid": 2001,
                    "supplementalGroups": [3001, 3002],
                },
            },
            {
                "metadata": {"name": "1002"},
                "spec": {
                    "uid": 1002,
                    "gid": 2002,
                    # intentionally omit supplementalGroups to test default
                },
            },
        ]
    }

    actual = lookup_identities_in_kubernetes(mock_kubectl)

    expected = {
        1001: {
            "uid": 1001,
            "gid": 2001,
            "supplementalGroups": [3001, 3002],
        },
        1002: {
            "uid": 1002,
            "gid": 2002,
            "supplementalGroups": [],
        },
    }

    assert actual == expected

    mock_kubectl.list_cluster_custom_object.assert_called_once_with(
        group=IdentityCrd.GROUP,
        version=IdentityCrd.VERSION,
        plural=IdentityCrd.PLURAL,
    )
