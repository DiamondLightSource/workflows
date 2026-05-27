from unittest.mock import Mock

import kubernetes.client

from identity_mapper.__main__ import (
    _CRD_GROUP,
    _CRD_PLURAL,
    _CRD_VERSION,
    sync_ldap_to_kubernetes,
)


def test_sync_add_user():
    mock_kubectl = Mock(spec=kubernetes.client.CustomObjectsApi)

    ldap_data = {1001: {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]}}

    kubernetes_data = {}  # user does not exist yet

    sync_ldap_to_kubernetes(mock_kubectl, ldap_data, kubernetes_data)

    mock_kubectl.create_cluster_custom_object.assert_called_once()
    args = mock_kubectl.create_cluster_custom_object.call_args[0]

    assert args[0] == _CRD_GROUP
    assert args[1] == _CRD_VERSION
    assert args[2] == _CRD_PLURAL
    assert args[3]["metadata"]["name"] == "1001"


def test_sync_remove_user():
    mock_kubectl = Mock(spec=kubernetes.client.CustomObjectsApi)

    ldap_data = {}  # no users in LDAP

    kubernetes_data = {1001: {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]}}

    sync_ldap_to_kubernetes(mock_kubectl, ldap_data, kubernetes_data)

    mock_kubectl.delete_cluster_custom_object.assert_called_once_with(
        _CRD_GROUP, _CRD_VERSION, _CRD_PLURAL, "1001"
    )


def test_sync_update_user():
    mock_kubectl = Mock(spec=kubernetes.client.CustomObjectsApi)

    ldap_data = {1001: {"uid": 1001, "gid": 9999, "supplementalGroups": [4000]}}

    kubernetes_data = {1001: {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]}}

    sync_ldap_to_kubernetes(mock_kubectl, ldap_data, kubernetes_data)

    mock_kubectl.patch_cluster_custom_object.assert_called_once()

    args = mock_kubectl.patch_cluster_custom_object.call_args[0]

    assert args[0] == _CRD_GROUP
    assert args[1] == _CRD_VERSION
    assert args[2] == _CRD_PLURAL
    assert args[3] == "1001"
    assert args[4]["spec"]["gid"] == 9999


def test_sync_no_changes():
    mock_kubectl = Mock(spec=kubernetes.client.CustomObjectsApi)

    ldap_data = {1001: {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]}}

    kubernetes_data = {"1001": {"uid": 1001, "gid": 2001, "supplementalGroups": [3001]}}

    sync_ldap_to_kubernetes(mock_kubectl, ldap_data, kubernetes_data)

    mock_kubectl.create_cluster_custom_object.assert_not_called()
    mock_kubectl.delete_cluster_custom_object.assert_not_called()
    mock_kubectl.patch_cluster_custom_object.assert_not_called()
