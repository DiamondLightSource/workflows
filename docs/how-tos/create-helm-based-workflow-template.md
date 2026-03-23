# Helm Templating WorkflowTemplates

Helm is a process to help you manage your Kubernetes applications - or in this
case, WorkflowTemplates.
It allows you to configure and point at data, environmental variables and more
that can be part of your template (manifests) without cluttering one file.

!!! warning
    Please inform any Data Analysis Workflows Team members of any changes in
    repository structure that is made to ensure we configure the platform to read
    your WorkflowTemplates correctly.

!!! info
    This is not an extensive list and a full explanation of Helm and its
    capabilities. This is aimed to show how to setup your repository to helm
    templating for your WorkflowTemplates. For more information about helm and its
    use cases use the read about it [here](https://helm.sh/)

## Helm Structure

Every Helm package has a strict folder structure which needs to be adhered to.
The common chart below shows the core structure of folder of a Helm chart.
```text
.
├── data
│   ├── notebooks
│   ├── textfiles
│   └── etc
├── templates
│   ├── WorkflowTemplate1.yaml
│   ├── WorkflowTemplate2.yaml
│   └── WorkflowTemplate3.yaml
└── Chart.yaml
```

- The data directory can be used to store any files that want to be
referred to. This is where you have all the flexibility to create subdirectories,
have different file types.

    - It is recommended to have any other data being accessed be found in the data
    directory.

    - This folder is not part of the main helm structure but is useful to keep
    your data kept neatly.

- The templates directory contains the WorkflowTemplate yaml files that will be
read. These files will be similar to the WorkflowTemplates that you have created
before.
- The Chart.yaml file has the versioning of the file and will mostly be unchanged

!!! note
    The core structure of the a helm folder can be created using the command
    `helm install {folder_name}`

## File Structures
### Chart.yaml

```yaml
apiVersion: v2
name: helm-templates
description: Helm ClusterWorkflowTemplates for Science Group
type: application
version: 0.1.0
```

- The Chart.yaml file only requires an arbitrary name and description that can
be set specific to the Science Group / Beamline etc.
- It is best practice to bump the Chart version and when making changes for
a Chart release. This can bumped in any way required as long as it is incrementing.
It is suggested to use [MAJOR.MINOR.PATCH](https://semver.org) versioning as a
standard. However, in the case of creating and maintaining WorkflowTemplates,
however this is not essential.
- There are other parameters in the Chart.yaml can be added like dependencies,
keywords and sources which are out of scope of WorkflowTemplates which can be
read [here](https://helm.sh/docs/topics/charts/#the-chartyaml-file)

### WorkflowTemplate.yaml

Below is a brief example of a Jupyter notebook that will be mounted in a
temp-mounted folder and in the session directory and is read on the console.
The full explanation is in documentation on how to write a workflow.

??? example "WorkflowTemplate Example"
    ```yaml
    apiVersion: argoproj.io/v1alpha1
    kind: ClusterWorkflowTemplate
    metadata:
      name: notebook-reading
    spec:
      entrypoint: notebook-workflow
      arguments:
        parameters:
    - name: visitdir
            valueFrom:
              configMapKeyRef:
                name: sessionspaces
                key: data_directory
      volumes:
        - name: session
          hostPath:
            path: "{{`{{ workflow.parameters.visitdir }}`}}"
            type: Directory
      volumeClaimTemplates:
        - metadata:
            name: tmp
          spec:
            accessModes: [ "ReadWriteOnce" ]
            resources:
              requests:
                storage: 1Gi
            storageClassName: netapp

      templates:
        - name: read
          script:
            image: docker.io/library/python:bookworm
            command: [bash]
            source: |
              cat "{{`{{ workflow.parameters.visitdir }}`}}"/notebook.ipynb
              cat /tmp/notebook.ipynb
            volumeMounts:
              - name: session
                mountPath: "{{`{{ workflow.parameters.visitdir }}`}}"

        - name: mount
          script:
            image: docker.io/library/python:bookworm
            command: [bash]
            source: |
              echo '{{ .Files.Get "data/pandas.ipynb" | b64enc }}' | base64 -d > /tmp/notebook.ipynb
              echo '{{ .Files.Get "data/pandas.ipynb" | b64enc }}' | base64 -d > "{{`{{ workflows.parameters.visitdir}}`}}"/notebook.ipynb
            volumeMounts:
              - name: tmp
                mountPath: /tmp
              - name: session
                mountPath: "{{`{{workflow.parameters.visitdir}}`}}"
          outputs:
            artifacts:
              - name: notebook
                path: /tmp/notebook.ipynb
                archive:
                  none: {}
        - name: notebook-workflow
          dag:
            tasks:
              - name: mount-notebook
                template: mount
              - name: read-files
                template: read
                dependencies: [mount-notebook]

    ```

## Helm Templating and Argo Templating

Helm and Argo both use templating mechanisms to help you dynamically generate
configuration files.

- **Helm Templating**: Helm uses `{{ ... }}` to reference files or values within
your chart. For example, to include the contents of a file (such as a notebook)
in your template, you can use: `{{ .Files.Get "data/notebooks" | b64enc }}`
This command reads the file at `data/notebooks` and encodes it in base64. Helm
processes these templates before passing them to the platform.

- **Why base64?**: Files must be serialised because Helm completes all
templating before the workflow is submitted. If you do not encode the file, the
literal template string (e.g., `{{ .Files.Get "data/notebooks" | b64enc }}`)
will be passed instead of the file contents.

- **Argo Templating**: Argo also uses templating, but to avoid conflicts with
Helm, you need to add an extra set of curly braces. For example, to reference a
workflow parameter in Argo, use: `{{`{{workflow.parameters.visitdir}}`}}`
This ensures Helm renders the template correctly, and Argo can substitute its
own values at runtime.

!!! note
    When using both Helm and Argo templating, always double-wrap Argo variables to
    prevent Helm from evaluating them.

## Having Both Helm and Manifest WorkflowTemplates

If you would like your GitHub repository to have both helm and regular
WorkflowTemplates, structure your repository with one folder for
each template type.

```text
.
├── manifests
│   ├── Template1.yaml
│   └── Template2.yaml
├── helm
│   └── *helm-structure
```
