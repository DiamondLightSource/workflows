from unittest.mock import Mock

import kubernetes.client
from kubernetes.client.exceptions import ApiException

from identity_mapper._identity import IdentityCrd, UserIdentityMapCrd
from identity_mapper._sync_ldap_to_kubernetes import (
    sync_ldap_to_kubernetes,
    sync_user_identity_map,
)


def test_sync_add_user() -> None:
    mock_kubectl = Mock(spec=kubernetes.client.CustomObjectsApi)

    ldap_data = {1001: {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]}}

    kubernetes_data = {}

    sync_ldap_to_kubernetes(mock_kubectl, ldap_data, kubernetes_data)

    mock_kubectl.create_cluster_custom_object.assert_called_once()
    args = mock_kubectl.create_cluster_custom_object.call_args[0]

    assert args[0] == IdentityCrd.GROUP
    assert args[1] == IdentityCrd.VERSION
    assert args[2] == IdentityCrd.PLURAL
    assert args[3]["metadata"]["name"] == "1001"


def test_sync_remove_user() -> None:
    mock_kubectl = Mock(spec=kubernetes.client.CustomObjectsApi)

    ldap_data = {}  # no users in LDAP

    kubernetes_data = {1001: {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]}}

    sync_ldap_to_kubernetes(mock_kubectl, ldap_data, kubernetes_data)

    mock_kubectl.delete_cluster_custom_object.assert_called_once_with(
        IdentityCrd.GROUP, IdentityCrd.VERSION, IdentityCrd.PLURAL, "1001"
    )


def test_sync_update_user() -> None:
    mock_kubectl = Mock(spec=kubernetes.client.CustomObjectsApi)

    ldap_data = {1001: {"uid": 1001, "gid": 9999, "supplementalGroups": [4000]}}

    kubernetes_data = {1001: {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]}}

    sync_ldap_to_kubernetes(mock_kubectl, ldap_data, kubernetes_data)

    mock_kubectl.patch_cluster_custom_object.assert_called_once()

    args = mock_kubectl.patch_cluster_custom_object.call_args[0]

    assert args[0] == IdentityCrd.GROUP
    assert args[1] == IdentityCrd.VERSION
    assert args[2] == IdentityCrd.PLURAL
    assert args[3] == "1001"
    assert args[4]["spec"]["gid"] == 9999


def test_sync_no_changes() -> None:
    mock_kubectl = Mock(spec=kubernetes.client.CustomObjectsApi)

    ldap_data = {1001: {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]}}

    kubernetes_data = {1001: {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]}}

    sync_ldap_to_kubernetes(mock_kubectl, ldap_data, kubernetes_data)

    mock_kubectl.create_cluster_custom_object.assert_not_called()
    mock_kubectl.delete_cluster_custom_object.assert_not_called()
    mock_kubectl.patch_cluster_custom_object.assert_not_called()


def test_sync_remove_supplemental_group() -> None:
    mock_kubectl = Mock(spec=kubernetes.client.CustomObjectsApi)

    ldap_data = {1001: {"uid": 1001, "gid": 9999, "supplementalGroups": [4000, 6000]}}

    kubernetes_data = {
        1001: {"uid": 1001, "gid": 2001, "supplementalGroups": [4000, 5000, 6000]}
    }

    sync_ldap_to_kubernetes(mock_kubectl, ldap_data, kubernetes_data)

    mock_kubectl.patch_cluster_custom_object.assert_called_once()

    args = mock_kubectl.patch_cluster_custom_object.call_args[0]

    assert args[0] == IdentityCrd.GROUP
    assert args[1] == IdentityCrd.VERSION
    assert args[2] == IdentityCrd.PLURAL
    assert args[3] == "1001"
    assert args[4]["spec"]["gid"] == 9999
    assert args[4]["spec"]["supplementalGroups"] == [4000, 6000]


def _not_found() -> ApiException:
    return ApiException(status=404)


def test_sync_identity_map_creates_when_missing() -> None:
    mock_kubectl = Mock(spec=kubernetes.client.CustomObjectsApi)
    mock_kubectl.get_cluster_custom_object.side_effect = _not_found()

    ldap_data = {
        1001: {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]},
        1002: {"uid": 1002, "gid": 2002, "supplementalGroups": []},
    }

    sync_user_identity_map(mock_kubectl, ldap_data)

    mock_kubectl.create_cluster_custom_object.assert_called_once()
    args = mock_kubectl.create_cluster_custom_object.call_args[0]
    assert args[0] == UserIdentityMapCrd.GROUP
    assert args[1] == UserIdentityMapCrd.VERSION
    assert args[2] == UserIdentityMapCrd.PLURAL
    assert args[3]["metadata"]["name"] == UserIdentityMapCrd.NAME
    assert args[3]["spec"]["users"]["1001"]["uid"] == 1001
    assert args[3]["spec"]["users"]["1001"]["gid"] == 2001
    assert args[3]["spec"]["users"]["1001"]["supplementalGroups"] == [3001]
    assert args[3]["spec"]["users"]["1002"]["supplementalGroups"] == []
    mock_kubectl.replace_cluster_custom_object.assert_not_called()


def test_sync_identity_map_updates_when_changed() -> None:
    mock_kubectl = Mock(spec=kubernetes.client.CustomObjectsApi)
    mock_kubectl.get_cluster_custom_object.return_value = {
        "spec": {
            "users": {"1001": {"uid": 1001, "gid": 9999, "supplementalGroups": [3001]}}
        }
    }

    ldap_data = {1001: {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]}}

    sync_user_identity_map(mock_kubectl, ldap_data)

    mock_kubectl.replace_cluster_custom_object.assert_called_once()
    args = mock_kubectl.replace_cluster_custom_object.call_args[0]
    assert args[3] == UserIdentityMapCrd.NAME
    assert args[4]["spec"]["users"]["1001"]["gid"] == 2001
    mock_kubectl.create_cluster_custom_object.assert_not_called()


def test_sync_identity_map_noop_when_in_sync() -> None:
    mock_kubectl = Mock(spec=kubernetes.client.CustomObjectsApi)
    mock_kubectl.get_cluster_custom_object.return_value = {
        "spec": {
            "users": {"1001": {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]}}
        }
    }

    ldap_data = {1001: {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]}}

    sync_user_identity_map(mock_kubectl, ldap_data)

    mock_kubectl.create_cluster_custom_object.assert_not_called()
    mock_kubectl.replace_cluster_custom_object.assert_not_called()
