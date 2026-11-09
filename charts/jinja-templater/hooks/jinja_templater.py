"""Metacontroller sync/customize hook for JinjaTemplate resources.

A ``JinjaTemplate`` (``templating.diamond.ac.uk/v1alpha1``) declares:

* ``spec.sources``: Kubernetes objects (Secrets, ConfigMaps, ...) to read.
* ``spec.templates``: named Jinja templates that render full Kubernetes
  manifests.

The hook is deliberately generic: it knows nothing about the objects it
composes. It:

1. (customize) asks metacontroller to watch every declared source, so a change
   to any source re-triggers a sync.
2. (sync) exposes the sources to Jinja, renders each template, and returns the
   resulting manifests as children.

Sources are exposed to templates both as a mapping (``sources.<alias>``) and as
top-level variables named after their ``alias`` (default: the object name with
non-identifier characters replaced by ``_``). Secret ``data`` values are
base64-decoded; ConfigMap ``data`` and ``stringData`` are exposed as-is. The
original object is available under ``raw``.

If a template references a source that does not exist yet, Jinja's
``StrictUndefined`` raises and the template is skipped (and reported in status)
instead of failing the whole sync. A template that renders only whitespace is
skipped too. Skipped and errored templates keep the children they rendered
before, so a transient problem does not delete a working resource.

Rendered manifests must live in the parent's namespace (children of a namespaced
parent cannot live elsewhere); the namespace is defaulted when omitted.

The chart declares only Secrets and ConfigMaps as child resources.
"""

import base64
import json
import logging
import re
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any

import yaml
from jinja2 import Environment, StrictUndefined, TemplateError, UndefinedError

logger = logging.getLogger("jinja-templater")

# Names that templates may not use as a source alias, because the hook owns them.
RESERVED_NAMES = frozenset({"sources", "parent", "namespace"})


class SkipTemplate(Exception):
    """Raised when a template intentionally renders nothing."""


class TemplateRenderError(Exception):
    """Raised when a rendered document cannot be used as a child resource."""


def gvk_key(kind: str, api_version: str) -> str:
    """Return metacontroller's related-resource key for a GroupVersionKind.

    Metacontroller keys related objects by ``Kind.version`` for the core group
    and ``Kind.group/version`` otherwise, for example ``Secret.v1`` or
    ``Deployment.apps/v1``.
    """
    if "/" in api_version:
        group, version = api_version.split("/", 1)
        return f"{kind}.{group}/{version}"
    return f"{kind}.{api_version}"


def b64_decode(value: str) -> str:
    """Decode a base64 string, returning the input unchanged if it is not valid."""
    try:
        return base64.b64decode(value, validate=True).decode("utf-8")
    except ValueError, UnicodeDecodeError:
        return value


def b64_encode(value: Any) -> str:
    """Encode a value as base64."""
    if not isinstance(value, str):
        value = str(value)
    return base64.b64encode(value.encode("utf-8")).decode("ascii")


def from_yaml(value: str) -> Any:
    """Parse a YAML string."""
    return yaml.safe_load(value)


def to_yaml(value: Any) -> str:
    """Serialise a value as YAML, preserving key order."""
    return yaml.safe_dump(value, default_flow_style=False, sort_keys=False)


def combine(base: Any, other: Any) -> dict:
    """Merge two mappings, with ``other`` taking precedence."""
    merged = dict(base or {})
    merged.update(other or {})
    return merged


def default_alias(name: str) -> str:
    """Turn an object name into a valid, readable Jinja identifier."""
    alias = re.sub(r"[^0-9A-Za-z_]", "_", name)
    if not alias:
        return "_"
    if alias[0].isdigit():
        alias = f"_{alias}"
    return alias


def normalize_source(obj: dict) -> dict:
    """Build the object exposed to templates for one source."""
    data = obj.get("data") or {}
    if obj.get("kind") == "Secret":
        data = {key: b64_decode(value) for key, value in data.items()}
    return {
        "apiVersion": obj.get("apiVersion"),
        "kind": obj.get("kind"),
        "metadata": obj.get("metadata") or {},
        "data": data,
        "stringData": obj.get("stringData") or {},
        "raw": obj,
    }


def lookup_related(related: dict, source: dict, parent_namespace: str) -> dict | None:
    """Find a source object in the related-resources map."""
    namespace = source.get("namespace") or parent_namespace
    name = source.get("name", "")
    kind = source.get("kind", "")
    api_version = source.get("apiVersion", "")
    qualified_name = f"{namespace}/{name}"

    if kind and api_version:
        group = related.get(gvk_key(kind, api_version))
        if isinstance(group, dict) and isinstance(group.get(qualified_name), dict):
            return group[qualified_name]

    # Fall back to scanning every group so a different metacontroller key format
    # does not silently break composition.
    for objects in related.values():
        if not isinstance(objects, dict):
            continue
        candidate = objects.get(qualified_name)
        if not isinstance(candidate, dict):
            continue
        if kind and candidate.get("kind") not in (None, kind):
            continue
        if api_version and candidate.get("apiVersion") not in (None, api_version):
            continue
        return candidate
    return None


def build_context(parent: dict, related: dict) -> dict[str, Any]:
    """Build the Jinja context from the parent and its related objects."""
    parent_namespace = (parent.get("metadata") or {}).get("namespace", "")
    spec = parent.get("spec") or {}
    sources: dict[str, dict] = {}
    context: dict[str, Any] = {}

    for source in spec.get("sources") or []:
        obj = lookup_related(related, source, parent_namespace)
        if obj is None:
            # Leave the alias undefined so StrictUndefined skips dependent
            # templates instead of rendering them from partial data.
            continue
        alias = source.get("alias") or default_alias(source.get("name", ""))
        if alias in RESERVED_NAMES:
            msg = f"source alias {alias!r} is reserved"
            raise TemplateRenderError(msg)
        if alias in sources:
            msg = f"duplicate source alias {alias!r}"
            raise TemplateRenderError(msg)
        normalized = normalize_source(obj)
        sources[alias] = normalized
        context[alias] = normalized

    context["sources"] = sources
    context["parent"] = parent
    context["namespace"] = parent_namespace
    return context


def make_environment() -> Environment:
    """Create the Jinja environment used to render every template."""
    environment = Environment(
        undefined=StrictUndefined,
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
        keep_trailing_newline=True,
    )
    environment.filters.update(
        {
            "b64decode": b64_decode,
            "b64encode": b64_encode,
            "combine": combine,
            "fromyaml": from_yaml,
            "toyaml": to_yaml,
            "to_yaml": to_yaml,
            "to_nice_yaml": to_yaml,
        }
    )
    return environment


def render_template(
    name: str,
    template_source: str,
    context: dict[str, Any],
    parent_namespace: str,
) -> list[dict]:
    """Render one template into a list of child manifests."""
    environment = make_environment()
    rendered = environment.from_string(template_source).render(**context)
    if not rendered.strip():
        msg = "template rendered no content"
        raise SkipTemplate(msg)

    manifests = []
    for document in yaml.safe_load_all(rendered):
        if document is None:
            continue
        if not isinstance(document, dict):
            msg = f"{name}: rendered document is not an object"
            raise TemplateRenderError(msg)
        if not document.get("apiVersion") or not document.get("kind"):
            msg = f"{name}: rendered document is missing apiVersion or kind"
            raise TemplateRenderError(msg)
        metadata = document.setdefault("metadata", {})
        if not isinstance(metadata, dict):
            msg = f"{name}: rendered metadata is not an object"
            raise TemplateRenderError(msg)
        namespace = metadata.get("namespace")
        if namespace and namespace != parent_namespace:
            msg = (
                f"{name}: child namespace {namespace!r} does not match "
                f"parent namespace {parent_namespace!r}"
            )
            raise TemplateRenderError(msg)
        metadata["namespace"] = parent_namespace
        manifests.append(document)

    if not manifests:
        msg = "template rendered no manifests"
        raise SkipTemplate(msg)
    return manifests


def build_status(parent: dict, states: dict[str, dict]) -> dict[str, Any]:
    """Build the status subresource written back to the JinjaTemplate."""
    rendered = [name for name, state in states.items() if state["state"] == "rendered"]
    skipped = [name for name, state in states.items() if state["state"] == "skipped"]
    errors = [name for name, state in states.items() if state["state"] == "error"]

    if errors:
        condition_status = "False"
        reason = "TemplateError"
        message = f"Template errors: {', '.join(sorted(errors))}"
    elif skipped:
        condition_status = "False"
        reason = "TemplatesSkipped"
        details = "; ".join(f"{name}: {states[name]['reason']}" for name in sorted(skipped))
        message = f"Skipped templates: {details}"
    elif not states:
        condition_status = "True"
        reason = "NoTemplates"
        message = "No templates are defined"
    else:
        condition_status = "True"
        reason = "TemplatesRendered"
        message = f"Rendered {len(rendered)} template(s)"

    status: dict[str, Any] = {
        "conditions": [
            {
                "type": "Ready",
                "status": condition_status,
                "reason": reason,
                "message": message,
            }
        ],
        "templates": states,
    }
    generation = (parent.get("metadata") or {}).get("generation")
    if generation is not None:
        status["observedGeneration"] = generation
    return status


def flatten_children(children: dict) -> list[dict]:
    """Flatten metacontroller's children map into a list of objects."""
    flattened: list[dict] = []
    for objects in (children or {}).values():
        if not isinstance(objects, dict):
            continue
        for obj in objects.values():
            if isinstance(obj, dict):
                flattened.append(obj)
    return flattened


def previous_children(states: dict, name: str) -> list[str]:
    """Return the child names a template produced on an earlier render."""
    state = states.get(name)
    if not isinstance(state, dict):
        return []
    names = state.get("children") or []
    return [item for item in names if isinstance(item, str)]


def sync(parent: dict, related: dict, children: dict) -> dict[str, Any]:
    """Compute the desired children and status for one sync request."""
    parent = parent or {}
    related = related or {}
    parent_namespace = (parent.get("metadata") or {}).get("namespace", "")
    spec = parent.get("spec") or {}
    templates = spec.get("templates") or {}
    previous_states = (parent.get("status") or {}).get("templates") or {}

    try:
        context = build_context(parent, related)
        context_error = None
    except TemplateRenderError as error:
        context = {}
        context_error = str(error)

    desired_children: list[dict] = []
    states: dict[str, dict] = {}
    preserved_names: set[str] = set()

    def mark_unrendered(name: str, state: str, reason: str) -> None:
        """Record a template that did not render and keep its existing children."""
        entry = {"state": state, "reason": reason}
        previous = previous_children(previous_states, name)
        if previous:
            entry["children"] = previous
            preserved_names.update(previous)
        states[name] = entry

    for name, template_source in templates.items():
        if context_error is not None:
            mark_unrendered(name, "error", context_error)
            continue
        try:
            manifests = render_template(name, template_source, context, parent_namespace)
        except SkipTemplate as error:
            mark_unrendered(name, "skipped", str(error))
        except UndefinedError as error:
            mark_unrendered(name, "skipped", f"undefined source: {error}")
        except TemplateRenderError as error:
            mark_unrendered(name, "error", str(error))
        except TemplateError as error:
            mark_unrendered(name, "error", str(error))
        except yaml.YAMLError:
            # Do not put the parser output in status: it can contain rendered
            # secret values. Keep the detail in the controller logs instead.
            logger.exception("Template %s rendered invalid YAML", name)
            mark_unrendered(name, "error", "invalid YAML in rendered template")
        else:
            states[name] = {
                "state": "rendered",
                "children": [manifest["metadata"].get("name") for manifest in manifests],
            }
            desired_children.extend(manifests)

    # Keep children of skipped/errored templates so a transient problem (for
    # example a source being recreated) does not delete a working resource.
    claimed = {manifest["metadata"].get("name") for manifest in desired_children}
    for child in flatten_children(children):
        name = (child.get("metadata") or {}).get("name")
        if name in preserved_names and name not in claimed:
            desired_children.append(child)
            claimed.add(name)

    return {"status": build_status(parent, states), "children": desired_children}


def customize(parent: dict) -> list[dict]:
    """Declare the parent's sources as related resources, grouped for efficiency."""
    parent = parent or {}
    parent_namespace = (parent.get("metadata") or {}).get("namespace", "")
    spec = parent.get("spec") or {}

    groups: dict[tuple[str, str, str], set[str]] = {}
    for source in spec.get("sources") or []:
        api_version = source.get("apiVersion")
        resource = source.get("resource")
        name = source.get("name")
        if not (api_version and resource and name):
            continue
        namespace = source.get("namespace") or parent_namespace
        groups.setdefault((api_version, resource, namespace), set()).add(name)

    related = []
    for api_version, resource, namespace in sorted(groups):
        rule = {
            "apiVersion": api_version,
            "resource": resource,
            "names": sorted(groups[(api_version, resource, namespace)]),
        }
        if namespace:
            rule["namespace"] = namespace
        related.append(rule)
    return related


class Controller(BaseHTTPRequestHandler):
    """HTTP handler for the metacontroller sync and customize hooks."""

    def _send_json(self, code: int, payload: Any) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        if self.path == "/healthz":
            self._send_json(200, {"status": "ok"})
        else:
            self._send_json(404, {"error": "not found", "path": self.path})

    def do_POST(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        length = int(self.headers.get("Content-Length", 0))
        try:
            request = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError as error:
            self._send_json(400, {"error": f"invalid JSON: {error}"})
            return

        if self.path == "/sync":
            response = sync(
                request.get("parent", {}),
                request.get("related", {}),
                request.get("children", {}),
            )
        elif self.path == "/customize":
            response = {"relatedResources": customize(request.get("parent", {}))}
        else:
            self._send_json(404, {"error": "not found", "path": self.path})
            return
        self._send_json(200, response)


def main() -> None:
    """Serve the hook on port 80."""
    logging.basicConfig(level=logging.INFO)
    HTTPServer(("", 80), Controller).serve_forever()


if __name__ == "__main__":
    main()
