from typing import TypedDict


class Identity(TypedDict):
    uid: int
    gid: int
    supplementalGroups: list[int]


class IdentityCrd:
    GROUP = "workflows.internal.diamond.ac.uk"
    VERSION = "v1"
    PLURAL = "useridentities"
