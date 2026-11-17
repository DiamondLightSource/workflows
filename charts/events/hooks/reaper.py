"""
Deletes Triggers that have outlived their ``spec.lifetime``.

A ``Trigger`` is expired when ``now - metadata.creationTimestamp`` is at least
its ``spec.lifetime``. A missing ``lifetime`` is treated as ``24h`` (the CRD
default); ``lifetime: forever`` (or ``forever``) never expires.

Runs on a schedule as a CronJob. Uses only the standard library and talks to
the Kubernetes API through the pod's service account token.
"""

import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

# Group/version/plural of the Trigger custom resource.
GROUP = "workflows.diamond.ac.uk"
VERSION = "v1alpha1"
PLURAL = "triggers"
API_ROOT = f"/apis/{GROUP}/{VERSION}"

# A missing lifetime falls back to the CRD default.
DEFAULT_LIFETIME = "24h"

# Matches the CRD's lifetime pattern.
_LIFETIME_RE = re.compile(r"^(\d+)([smh])$")

# Lifetime that never expires.
_FOREVER = "forever"


def _api_base():
    host = os.environ.get("KUBERNETES_SERVICE_HOST")
    port = os.environ.get("KUBERNETES_SERVICE_PORT_HTTPS", "443")
    if not host:
        raise RuntimeError("KUBERNETES_SERVICE_HOST is not set (not running in-cluster)")
    return f"https://{host}:{port}"


def _token():
    with open("/var/run/secrets/kubernetes.io/serviceaccount/token", encoding="utf-8") as f:
        return f.read().strip()


def _ssl_context():
    """SSL context that trusts the in-cluster service account's CA bundle."""
    context = ssl.create_default_context()
    context.load_verify_locations("/var/run/secrets/kubernetes.io/serviceaccount/ca.crt")
    return context


def _request(path):
    url = f"{_api_base()}{path}"
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {_token()}",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=_ssl_context()) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return None
        raise


def list_triggers():
    """Return all Triggers across every namespace."""
    body = _request(f"{API_ROOT}/{PLURAL}")
    if body is None:
        return []
    return body.get("items", [])


def parse_lifetime(raw):
    """Return the lifetime as a ``datetime.timedelta``, or ``None`` if forever."""
    if raw is None or raw == "":
        raw = DEFAULT_LIFETIME
    if raw == _FOREVER:
        return None
    match = _LIFETIME_RE.match(raw)
    if not match:
        # Unparsable lifetime: never expire rather than risk deleting early.
        return None
    amount, unit = int(match.group(1)), match.group(2)
    from datetime import timedelta

    seconds = {"s": 1, "m": 60, "h": 3600}[unit] * amount
    return timedelta(seconds=seconds)


def expired(trigger, now):
    spec = trigger.get("spec") or {}
    lifetime = parse_lifetime(spec.get("lifetime"))
    if lifetime is None:
        return False
    created = (trigger.get("metadata") or {}).get("creationTimestamp")
    if not created:
        return False
    created_at = datetime.fromisoformat(created.replace("Z", "+00:00"))
    return now - created_at >= lifetime


def delete_trigger(trigger):
    name = trigger["metadata"]["name"]
    namespace = trigger["metadata"].get("namespace", "")
    path = f"{API_ROOT}/namespaces/{namespace}/{PLURAL}/{name}"
    req = urllib.request.Request(
        f"{_api_base()}{path}",
        headers={
            "Authorization": f"Bearer {_token()}",
            "Accept": "application/json",
        },
        method="DELETE",
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=_ssl_context()) as resp:
            return resp.status
    except urllib.error.HTTPError as err:
        if err.code == 404:
            # Already gone; treat as success.
            return 404
        raise


def main():
    now = datetime.now(timezone.utc)
    triggers = list_triggers()
    expired_count = 0
    for trigger in triggers:
        if not expired(trigger, now):
            continue
        name = trigger["metadata"]["name"]
        namespace = trigger["metadata"].get("namespace", "")
        try:
            status = delete_trigger(trigger)
        except Exception as err:  # noqa: BLE001
            print(f"ERROR deleting trigger {namespace}/{name}: {err}", file=sys.stderr)
            sys.exit(1)
        print(f"Deleted expired trigger {namespace}/{name} (lifetime elapsed)")
        expired_count += 1
    print(f"Reaper run complete: {len(triggers)} triggers scanned, {expired_count} deleted")


if __name__ == "__main__":
    main()
