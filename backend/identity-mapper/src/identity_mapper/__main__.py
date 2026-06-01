"""Synchronize LDAP and Kubernetes user IDs and groups."""

import logging

import kubernetes
import ldap3

from ._lookup_identities_in_kubernetes import lookup_identities_in_kubernetes
from ._lookup_identities_in_ldap import lookup_identities_in_ldap
from ._sync_ldap_to_kubernetes import sync_ldap_to_kubernetes

_logger = logging.getLogger(__name__)


def _get_kubernetes_client() -> kubernetes.client.CustomObjectsApi:
    try:
        kubernetes.config.load_incluster_config()
    except kubernetes.config.ConfigException:
        kubernetes.config.load_kube_config()
    return kubernetes.client.CustomObjectsApi()


def _main() -> None:
    _logger.info("Connecting to LDAP")
    ldap_server: str = "ldap://ldapmaster.diamond.ac.uk"
    server = ldap3.Server(ldap_server)
    ldap = ldap3.Connection(server, auto_bind=True)
    _logger.info("Initializing kubernetes client")
    kubectl = _get_kubernetes_client()
    _logger.info("Looking up identities in LDAP")
    ldap_identities = lookup_identities_in_ldap(ldap)
    _logger.info("Looking up identities in Kubernetes")
    kubernetes_identities = lookup_identities_in_kubernetes(kubectl)
    _logger.info("Syncronizing identities")
    sync_ldap_to_kubernetes(kubectl, ldap_identities, kubernetes_identities)
    _logger.info("Complete.")


if __name__ == "__main__":
    _main()
