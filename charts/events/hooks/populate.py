"""
Populates Triggers that were not created through the dashboard.

Triggers created through ``graph-proxy::create_trigger`` are populated from
their ``ClusterTriggerTemplate`` at creation time and carry the
``workflows.diamond.ac.uk/trigger-populated`` annotation. A Trigger created by
``kubectl`` or other automation has no such annotation, so this sweep fills in
the template-owned parts of its ``spec`` and its ``beamline``/``source`` labels
— the behaviour the Kyverno ``populate-trigger-from-template`` rule used to
provide at admission time.

Runs on a schedule as a CronJob. Uses only the standard library and talks to
the Kubernetes API through the pod's service account token.
"""

import json
import os
import ssl
import sys
import urllib.error
import urllib.request

# Group/version/plural of the Trigger and ClusterTriggerTemplate resources.
GROUP = "workflows.diamond.ac.uk"
VERSION = "v1alpha1"
PLURAL = "triggers"
TEMPLATE_PLURAL = "clustertriggertemplates"
API_ROOT = f"/apis/{GROUP}/{VERSION}"

# Marker that a Trigger has already been populated from its template. Set by
# graph-proxy::create_trigger and by this sweep; its presence means the sweep
# must leave the Trigger alone so it does not revert a user's later edits.
POPULATED_ANNOTATION = "workflows.diamond.ac.uk/trigger-populated"

# Labels copied from the ClusterTriggerTemplate onto the Trigger.
TEMPLATE_LABELS = (
    "workflows.diamond.ac.uk/beamline",
    "workflows.diamond.ac.uk/source",
)


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


def _request(path, method="GET", body=None):
    data = json.dumps(body).encode() if body is not None else None
    headers = {
        "Authorization": f"Bearer {_token()}",
        "Accept": "application/json",
    }
    if body is not None:
        headers["Content-Type"] = "application/merge-patch+json"
    req = urllib.request.Request(
        f"{_api_base()}{path}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=30, context=_ssl_context()) as resp:
            if resp.status == 200:
                return json.loads(resp.read())
            return None
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


def get_template(name):
    """Return the ClusterTriggerTemplate with ``name``, or ``None`` if absent."""
    return _request(f"{API_ROOT}/{TEMPLATE_PLURAL}/{name}")


def desired_spec(current_spec, template_spec):
    """Merge the template's spec into the trigger's, template fields winning.

    Matches ``graph-proxy::merge_template_spec``: a shallow top-level merge in
    which the template's keys take precedence while the trigger's own
    ``templateRef`` (and anything else not present on the template) is kept.
    """
    merged = dict(current_spec or {})
    for key, value in (template_spec or {}).items():
        merged[key] = value
    return merged


def desired_labels(current_labels, template_labels):
    """Add the template's beamline/source labels, keeping all others."""
    labels = dict(current_labels or {})
    for key in TEMPLATE_LABELS:
        value = (template_labels or {}).get(key)
        if value is not None:
            labels[key] = value
    return labels


def desired_annotations(current_annotations):
    """Return the annotations with the populated marker set."""
    annotations = dict(current_annotations or {})
    annotations[POPULATED_ANNOTATION] = "true"
    return annotations


def patch_trigger(trigger, patch):
    name = trigger["metadata"]["name"]
    namespace = trigger["metadata"].get("namespace", "")
    path = f"{API_ROOT}/namespaces/{namespace}/{PLURAL}/{name}"
    return _request(path, method="PATCH", body=patch)


def main():
    triggers = list_triggers()
    populated = 0
    skipped = 0
    for trigger in triggers:
        metadata = trigger.get("metadata") or {}
        annotations = metadata.get("annotations") or {}
        if POPULATED_ANNOTATION in annotations:
            skipped += 1
            continue

        template_ref = (trigger.get("spec") or {}).get("templateRef")
        if not template_ref:
            skipped += 1
            continue

        template = get_template(template_ref)
        if template is None:
            name = metadata.get("name", "?")
            namespace = metadata.get("namespace", "")
            print(
                f"WARNING could not read ClusterTriggerTemplate {template_ref} for "
                f"Trigger {namespace}/{name}; leaving it unpopulated",
                file=sys.stderr,
            )
            skipped += 1
            continue

        template_metadata = template.get("metadata") or {}
        template_spec = (template.get("spec") or {})

        new_spec = desired_spec(trigger.get("spec"), template_spec)
        new_labels = desired_labels(metadata.get("labels"), template_metadata.get("labels"))
        new_annotations = desired_annotations(annotations)

        current_spec = trigger.get("spec")
        current_labels = metadata.get("labels") or {}
        if (
            new_spec == current_spec
            and new_labels == current_labels
            and new_annotations == annotations
        ):
            skipped += 1
            continue

        patch = {}
        if new_spec != current_spec:
            patch["spec"] = new_spec
        if new_labels != current_labels or new_annotations != annotations:
            patch["metadata"] = {"labels": new_labels, "annotations": new_annotations}

        name = metadata.get("name", "?")
        namespace = metadata.get("namespace", "")
        patch_trigger(trigger, patch)
        print(f"Populated Trigger {namespace}/{name} from ClusterTriggerTemplate {template_ref}")
        populated += 1

    print(f"Populator run complete: {len(triggers)} triggers scanned, {populated} populated, {skipped} skipped")


if __name__ == "__main__":
    main()
