# Workflow CLI

## Linting Workflows

The workflows CLI supports both traditional workflow templates, and helm based
workflow templates. The tool depends on you having both helm and argo installed.
If you load the tool through the module system, this should be taken care of.

## Usage

Individual templates are linted with the following

```bash
workflows lint <PATH TO MANIFEST>
```

To lint a folder full of manifests, add the `--all` tag

```bash
workflows lint <PATH TO MANIFEST DIRECTORY> --all
```

The same applies to helm-based templates. A specific template can be checked,

```bash
workflows lint <PATH TO TEMPLATE.YAML> --manifest-type helm
```

or all templates in a chart.

```bash
workflows lint <PATH TO CHART DIRECTORY> --manifest-type helm --all
```

For convenience, you can refer to a config file that defines all lint
targets. The tool will assume all paths refer to the `--all` form of the above.
This can be linted with the `lint-config` argument.

```bash
workflows lint-config <PATH TO LINT CONFIG FILE>
```

An example of the config is shown below.

```yaml
manifests:
  - examples/conventional-templates
charts:
  - examples/helm-based-templates
```
