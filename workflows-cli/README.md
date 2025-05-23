# Workflow Lint Action

## How to use it

Add the workflow-lint CI and to you `.github/workflows` folder.

```yaml
# .github/workflows/ci.yaml
name: Workflows Linter

on:
  push:
  pull_request:

jobs:
  public_linter:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout source
        uses: actions/checkout@v4.2.2

      - name: Lint workflows
        uses: diamondlightsource/workflows@lint-action
```

Then add your lint config to the root of the repository. Manifests refer to all workflow templates that exist as they are submitted, rather than manifests that must first be templated by helm. There is support in the linter for both. Define whichever your repo uses, and ommit either one if it's not used.

Paths generally refer to directories of workflows, but can also refer to specific workflows.

```yaml
# .workflows-lint.yaml
manifests:
  - examples/conventional-templates

helmManifests:
  - examples/helm-based-templates
```


## Advanced Config

The linter config doesn't have to go at the root of the repository. Reconfigure the action to set the `config_file` path to be somewhere else in the repository - relative to the root of the repo.

```yaml
- name: Lint workflows
  uses: diamondlightsource/workflows@lint-action
  with:
    config_file: examples/.workflows-lint.yaml
```