# jinja-templater

A small [Metacontroller](https://metacontroller.github.io/metacontroller/)
hook that renders Kubernetes resources from Jinja templates. It replaces
one-off Kubernetes controllers (and Kyverno generating policies) with a
declarative rule: a `JinjaTemplate` says which objects to read and which
templates to render.

## How it works

`JinjaTemplate` is a namespaced custom resource:

```yaml
apiVersion: templating.diamond.ac.uk/v1alpha1
kind: JinjaTemplate
metadata:
  name: example
  namespace: workflows
spec:
  sources:
    - name: settings
      alias: settings
      apiVersion: v1
      kind: ConfigMap
      resource: configmaps
      name: example-settings
    - name: credentials
      alias: credentials
      apiVersion: v1
      kind: Secret
      resource: secrets
      namespace: auth
      name: example-credentials
  templates:
    example-secret: |
      apiVersion: v1
      kind: Secret
      metadata:
        name: example
        namespace: {{ namespace }}
      type: Opaque
      stringData:
        token: "{{ credentials.data['token'] }}"
```

* The **customize** hook declares every source as a related resource, so a
  change to any source (in any namespace) re-triggers a sync.
* The **sync** hook renders every template and returns the manifests as
  children. Only Secrets and ConfigMaps are declared as child resources.
* Children must live in the `JinjaTemplate`'s namespace. A manifest that omits
  `metadata.namespace` gets the parent's namespace; a different namespace is
  reported as an error.
* The result is written to `status`, visible with
  `kubectl get jinjatemplates` / `kubectl describe jinjatemplate <name>`.

## Source specification

| Field | Required | Description |
| --- | --- | --- |
| `name` | yes | Name of the Kubernetes object to read. |
| `apiVersion` | yes | `apiVersion` of the object. |
| `kind` | yes | `Kind` of the object. |
| `resource` | yes | Plural resource name, used by the customize hook (`secrets`, `configmaps`, ...). |
| `namespace` | no | Namespace of the object. Defaults to the `JinjaTemplate`'s namespace. |
| `alias` | no | Variable name exposed to templates. Defaults to `name` with non-identifier characters replaced by `_`. |

Sources are available to templates as `sources.<alias>` and as top-level
variables named after the alias. Each source has:

```python
{
    "apiVersion": ...,
    "kind": ...,
    "metadata": ...,
    "data": {...},        # Secret: base64-decoded; ConfigMap: unchanged
    "stringData": {...},
    "raw": {...},         # the original object
}
```

`parent`, `namespace` and `sources` are reserved names.

## Template behaviour

Templates are rendered with `StrictUndefined` and these extra filters:

| Filter | Description |
| --- | --- |
| `b64encode` / `b64decode` | Base64 encode/decode a string. |
| `fromyaml` | Parse a YAML string. |
| `toyaml` / `to_yaml` / `to_nice_yaml` | Serialise a value as YAML. |
| `combine(other)` | Merge maps, with `other` taking precedence. |

A template may render multiple YAML documents. If it renders only whitespace
(for example because a guard condition is false) it is skipped. If it
references a source that does not exist yet, it is skipped and reported in
`status`; the rest of the templates still render. Rendering or YAML errors are
reported in `status` and do not take down the controller.

When a template is skipped or errors, the children it rendered successfully
before are kept instead of being deleted. This means a transient problem (for
example a source Secret being recreated) does not remove a working resource;
once the source returns, the template renders again and replaces them. A
template that renders successfully is authoritative: children it no longer
produces are pruned.

## Deployment

The chart installs:

* the `JinjaTemplate` CRD,
* the Metacontroller `CompositeController`,
* a ConfigMap containing `hooks/jinja_templater.py`,
* a Deployment and Service running the hook.

The hook runs as a `python:3.14-slim` container and installs its pinned Python
dependencies at startup, matching the pattern used by the `events` chart.

### Ordering

ArgoCD must install the CRD and controller before any chart that defines a
`JinjaTemplate`. The `apps` chart therefore deploys this chart at sync wave 2
(after `metacontroller` at wave 1) and the consuming charts at wave 3. Charts
that define `JinjaTemplate` resources guard them with
`.Capabilities.APIVersions.Has "templating.diamond.ac.uk/v1alpha1"`, so a
standalone `helm template` does not need the CRD present.

## Tests

```sh
cd charts/jinja-templater/tests
uv sync --all-extras --dev
uv run pytest
uv run ruff format --check . ../hooks/jinja_templater.py
uv run ruff check . ../hooks/jinja_templater.py
```
