# Helm Templating WorkflowTemplates

Helm is a process to help you manage your Kubernetes applications - or in this
case, WorkflowTemplates.
It allows you to configure and point at data, environmental variables and more
that can be part of your template (manifests) without cluttering one file.

> [!IMPORTANT]
> Please inform any Data Analysis Workflows Team members of any changes in
repository structure that is made to ensure we configure the platform to read
your WorkflowTemplates correctly.

Helm simplifies sharing, versioning, customizing, installing, upgrading, and
rolling back Kubernetes apps at scale.

> [!NOTE]
> This is not an extensive list and a full explanation of Helm and its capabilities.
The aim of this how-to is to give an example on how to setup your repository to
using helm templating for your WorkflowTemplates.
For more information about helm and its use cases use the read about it
[here](https://helm.sh/)

## Helm Structure

Every Helm package has a strict folder structure which needs to be adhered to.
The common chart below shows the core structure of folder of a Helm chart.
```text
├── ..
│   ├── data
│   │   ├── notebooks
│   │   ├── textfiles
│   │   ├── etc
│   ├── templates
│   │   ├── WorkflowTemplate1.yaml
│   │   ├── WorkflowTemplate2.yaml
│   │   ├── WorkflowTemplate3.yaml
│   ├── Chart.yaml
```

- The data directory can contain be used to store any files that want to be
referred to. This is where you have all the flexibility to create subdirectories,
have different file types.
- The templates directory contains the WorkflowTemplate yaml files that will be
read. These files will be similar to the WorkflowTemplates that you have created
before.
- The Chart.yaml file has the versioning of the file and will mostly be unchanged

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
- The version needs bumping every time a change is made in the template. This
can bumped in any way required as long as it is increminting.
It is suggested to use [MAJOR.MINOR.PATCH](https://semver.org) versioning as a
standard
- There are other parameters in the Chart.yaml can be added like dependencies,
keywords and sources which are out of scope of WorkflowTemplates which can be
read [here](https://helm.sh/docs/topics/charts/#the-chartyaml-file)

### WorkflowTemplate.yaml

Below is a brief example of a Jupyter notebook that will is being mounted in a
temp-mounted folder and in the session directory and is read on the console.
The full explanation is in documentation on [how to write a workflow]().

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
        storageClassName: local-path

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
- explanation on {{ helm templating }
- explanation on {{`{{ argo templating }}`}} -> and the base64 encoding as well
- explanation on restructurng repository for both manifest or multiple helm-template groups
