"""Prepare a visit namespace and submit an Argo Workflow for event-triggered runs."""
import json
import os
import re
import ssl
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PREPARE_URL = os.environ.get(
    "PREPARE_URL",
    "http://sessionspaces-controller-api.kube-system.svc:8081/prepare",
)
KUBE_TOKEN_FILE = os.environ.get(
    "KUBE_TOKEN_FILE", "/var/run/secrets/kubernetes.io/serviceaccount/token"
)
KUBE_CA_FILE = os.environ.get(
    "KUBE_CA_FILE", "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"
)
KUBE_API = os.environ.get("KUBE_API", "https://kubernetes.default.svc")
# /prepare may block until the SessionSpace reports Ready, which can take up
# to the API's 120 s preparation timeout.
REQUEST_TIMEOUT = int(os.environ.get("REQUEST_TIMEOUT", "150"))
PORT = int(os.environ.get("PORT", "80"))


def _token(path):
    with open(path, encoding="utf-8") as handle:
        value = handle.read().strip()
    if not value:
        raise RuntimeError(f"token file {path} is empty")
    return value


def _prepare(namespace, token):
    """Call /prepare for the visit, returning the HTTP status code."""
    request = urllib.request.Request(
        PREPARE_URL,
        data=json.dumps({"namespace": namespace}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code


def _workflow_name(template, event_id):
    """A deterministic, retry-safe name derived from the event id."""
    slug = re.sub(r"[^a-z0-9]+", "-", (event_id or "").lower()).strip("-")[:32]
    return f"{template}-event-{slug or 'unknown'}"


def _submit(namespace, template, event_id, posixuid, parameters, token):
    """Submit the Workflow via the Kubernetes API, returning the status code."""
    context = (
        ssl.create_default_context(cafile=KUBE_CA_FILE)
        if KUBE_API.startswith("https")
        else None
    )
    body = {
        "apiVersion": "argoproj.io/v1alpha1",
        "kind": "Workflow",
        "metadata": {
            "name": _workflow_name(template, event_id),
            "labels": {"workflows.diamond.ac.uk/triggeruid": posixuid or ""},
        },
        "spec": {
            "serviceAccountName": "argo-workflow",
            "workflowTemplateRef": {"name": template, "clusterScope": True},
            "arguments": {
                "parameters": [
                    {"name": parameter["name"], "value": parameter.get("value", "")}
                    for parameter in parameters
                ]
            },
        },
    }
    url = f"{KUBE_API}/apis/argoproj.io/v1alpha1/namespaces/{namespace}/workflows"
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT, context=context) as response:
            return response.status
    except urllib.error.HTTPError as error:
        return error.code


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
            payload = json.loads(self.rfile.read(length) or b"{}")
            self._handle(payload)
        except Exception as error:  # noqa: BLE001 - respond to the sensor
            self.log_message("failed: %s", error)
            self._reply(502, {"prepared": False, "submitted": False, "error": str(error)})

    def _handle(self, payload):
        namespace = str(payload.get("namespace") or "")
        if not namespace:
            self._reply(400, {"error": "missing namespace"})
            return

        token = _token(KUBE_TOKEN_FILE)
        status = _prepare(namespace, token)
        if status == 400:
            # Not a real ISPyB session: nothing to prepare or submit.
            self.log_message("no ISPyB session for %s; skipping", namespace)
            self._reply(
                200,
                {"prepared": False, "skipped": True, "reason": "not an ISPyB session"},
            )
            return
        if status == 403:
            self.log_message(
                "prepare denied for %s (status 403); skipping", namespace
            )
            self._reply(
                200,
                {"prepared": False, "skipped": True, "reason": "prepare denied"},
            )
            return
        if status != 200:
            # Transient or unknown failure: fail the trigger so it is retried.
            self._reply(
                502, {"prepared": False, "error": f"prepare returned status {status}"}
            )
            return

        submitted = _submit(
            namespace,
            str(payload.get("template") or ""),
            str(payload.get("eventId") or ""),
            str(payload.get("posixuid") or ""),
            payload.get("parameters") or [],
            token,
        )
        if submitted in (201, 409):
            self._reply(
                200,
                {
                    "prepared": True,
                    "submitted": True,
                    "alreadyExists": submitted == 409,
                },
            )
            return
        self.log_message(
            "workflow submit failed for %s: status %s", namespace, submitted
        )
        self._reply(
            502,
            {"prepared": True, "submitted": False, "error": f"submit returned {submitted}"},
        )

    def _reply(self, code, body):
        data = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, fmt, *args):  # noqa: A003 - stdlib hook, keep signatures
        sys.stderr.write(f"[{self.log_date_time_string()}] {fmt % args}\n")


def main():
    server = ThreadingHTTPServer(("", PORT), Handler)
    server.daemon_threads = True
    server.serve_forever()


if __name__ == "__main__":
    main()
