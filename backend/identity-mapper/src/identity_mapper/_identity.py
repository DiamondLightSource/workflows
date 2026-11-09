from typing import TypedDict


class Identity(TypedDict):
    uid: int
    gid: int
    supplementalGroups: list[int]


class IdentityCrd:
    GROUP = "workflows.internal.diamond.ac.uk"
    VERSION = "v1"
    PLURAL = "useridentities"


class UserIdentityMapCrd:
    GROUP = "workflows.internal.diamond.ac.uk"
    VERSION = "v1"
    PLURAL = "useridentitymaps"
    # A single, cluster-scoped aggregated mapping of posix-uid -> identity. The
    # identity-mapper cronjob keeps it in sync with LDAP so admission CEL
    # policies can paramRef it (MutatingAdmissionPolicy has no dynamic lookup).
    NAME = "user-identity-map"
