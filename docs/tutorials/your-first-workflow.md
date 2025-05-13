# Your First Workflow

This guide will cover writing your first workflow. The focus will be on the structure of the workflow, and the pitfalls involved in making one, rather than any specific science.

## Boilerplate to start

Start with the following boilerplate. With this, you can jump straight to adding your steps/logic.

There are three significant parts to this boilerplate. Note that the `kind` is currently workflow - not ClusterWorkflowTemplate at this point. This is for convenience to allow you to submit the workflow directly when testing.

### 1) Metadata

At the top we see a metadata section. Here you must name the template. There is also the option to add a science-group, title, and description. These fields are all optional but it is recommended to fill them in as they're used when filtering and searching for templates. At the time of writing, these are the only fields, but these will be expanded in future.

### 2) The Entrypoint

All workflows need an entrypoint. Here we use a dag (directed acyclic graph). The dag is itself a template that uses other templates, arranged by task. There is another way to handle multi-task workflows, but this is by far the best. In workflows where only one step is used, the entry-point can be a normal template, rather than a dag.

### 3) Volume Mounts

For the sake of security, no workflow can write to its own filesystem - but in practice, almost all will need to. To facilitate this, add one (or more) volumeClaimTemplates to the workflow spec. When using the volumeClaimTemplate in multiple steps, the steps will share the same files.

!!! important "Volume Mounts"
    When creating artefact, you must use a volume mount to store them in. Be careful not to overwrite artefact in parallel steps - particularly when using looping or reusing the same template.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  name: boilerplate-example
  labels:
    workflows.diamond.ac.uk/science-group: workflows-examples
  annotations:
    workflows.argoproj.io/title: boiler-plate-example for docs
    workflows.argoproj.io/description: |
        This is an example demo-ing the boilerplate

spec:
  entrypoint: workflow-entry
  volumeClaimTemplates:
  - metadata:
      name: tmpdir
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
      storageClassName: local-path

  templates:
  - name: placeholder
    script:
      image: busybox
      command: [bash]
      source: |
        echo "Hello world"

  - name: workflow-entry
    dag:
      tasks:
      - name: placeholder
        template: placeholder
```

## Validating The Workflow

Now you have the boilerplate, it is worth knowing how to check if the workflow is actually correct. Load the workflows module to access the argo tool.

```bash
module load workflows
```

!!! important "Loading Workflow Module"
    Loading the workflow module will also load the workflows cluster kubectl config, so be aware your 'kubectl' will no longer target argus/pollux (whichever was previously set). You can restore your previous config by running `export $KUBECONFIG=~/.kube/config_(CLUSTERNAME)

```bash
argo lint workflow.yaml
```

If all has gone to plan, this should return no linting errors.

## Adding Some Functionality

The goal is to create a workflow that will accept some inputs, then do some pre-processing, and then run analysis on the result of that pre-processing.

The workflow will take in a `start`, `stop`, and `step`, and then plot a sin function of each. This will be built from the ground-up, starting first with the steps, and then adding the parameterization later to enable a reasonable amount of debugging as we go.

### 1) Writing The Tasks

First, we must install required dependencies. I am using `script`s here, rather than containers for clarity, but the actual functionality can come from a range of inputs - including local-files. Remember the files-system is readonly - so we must create a venv in a writeable location, and then install the requirements into that.

```yaml
  - name: install-dependencies
    script:
      image: python:3.10
      volumeMounts:
      - name: tmpdir
        mountPath: /tmp
      command: [bash]
      source: |
        python -m venv /tmp/venv
        /tmp/venv/bin/pip install numpy matplotlib
```

Now we have have our venv configured, we can do some pre-processing to inform the next step. The pre-processing step accepts our bounds and step as we described above.
Here I print the range and output it as an artefact for convenience, but this isn't necessary.

There are many ways to pass different types of information between workflow steps, used for both data-transfer and conditional steps/looping. See the [examples section](https://github.com/DiamondLightSource/workflows/blob/main/examples/) for more complex demonstrations of these.

```yaml
  - name: pre-processing
    inputs:
      parameters:
        - name: start
        - name: stop
        - name: step
    script:
      image: python:3.10
      volumeMounts:
      - name: tmpdir
        mountPath: /tmp
      command: [/tmp/venv/bin/python]
      source: |
        import numpy as np
        import json
        start = {{inputs.parameters.start}}
        stop = {{inputs.parameters.stop}}
        step = {{inputs.parameters.step}}

        vals = np.arange(start,stop,step).tolist()
        with open("/tmp/data.json", "w") as f:
          json.dump(vals, f)
    outputs:
      artifacts:
      - name: gridPoints
        path: /tmp/data.json
        archive:
          none: { }
```

Now its time to plot a figure. This step will expect a list of gridPoints and compute the according function, then plot and save the figure. By default, the workflows engine will tarball outputs,
so we configure `archive: { none: {} }` to prevent this, and give us a raw .png file.

```yaml
  - name: plot-the-figure
    inputs:
      parameters:
        - name: gridPoints
    script:
      image: python:3.10
      volumeMounts:
      - name: tmpdir
        mountPath: /tmp
      command: [/tmp/venv/bin/python]
      source: |
        import matplotlib.pyplot as plt
        from math import sin
        import json

        with open("/tmp/data.json", "r") as f:
          x = json.load(f)
        y = [sin(val) for val in x]
        plt.plot(x,y)
        plt.savefig("/tmp/output_fig.png")
    outputs:
      artifacts:
      - name: sin-figure
        path: "/tmp/output_fig.png"
        archive:
          none: { }
```

The bulk of the work is now done so we can now fill in the DAG from our original boilerplate. This workflow has three steps, with linear dependencies so arranging this shouldn't be difficult.
Note the templating in the pre-processing step. By defining the parameter in the top level arguments, these can be easily overwritten when re-using the template. The respective arguments can
be seen below.

```yaml
  - name: workflow-entry
    dag:
      tasks:
      - name: install-dependencies
        template: install-dependencies

      - name: pre-processing
        dependencies: [install-dependencies]
        template: pre-processing
        arguments:
          parameters:
          - name: start
            value: "{{workflow.parameters.start}}"
          - name: stop
            value: "{{workflow.parameters.stop}}"
          - name: step
            value: "{{workflow.parameters.step}}"

      - name: plot-figure
        dependencies: [pre-processing]
        template: plot-the-figure
```

```yaml
spec:
  entrypoint: workflow-entry
  arguments:
    parameters:
      - name: start
        value: "2"
      - name: stop
        value: "10"
      - name: step
        value: "5"
```

Now we have a whole workflow! After putting all the parts together and linting it, you can submit it to verify the behavior. Once validated, switch the `kind` back to `ClusterWorkflowTempalate`,
and that should be finished!

After loading the workflows module, you can submit the workflow with the `argo` tool

```bash
argo submit formatted-workflow.yaml -n <SESSION-ID> --server https://kubernetes.workflows.diamond.ac.uk
```

The whole workflow can be viewed below

??? example "Complete Workflow"
    ```yaml
    apiVersion: argoproj.io/v1alpha1
    kind: Workflow
    metadata:
      name: boilerplate-example
      labels:
        workflows.diamond.ac.uk/science-group: workflows-examples
      annotations:
        workflows.argoproj.io/title: boiler-plate-example for docs
        workflows.argoproj.io/description: |
            This is an example demo-ing the boilerplate

    spec:
      entrypoint: workflow-entry
      arguments:
        parameters:
          - name: start
            value: "2"
          - name: stop
            value: "10"
          - name: step
            value: "5"
      volumeClaimTemplates:
      - metadata:
          name: tmpdir
        spec:
          accessModes: [ "ReadWriteOnce" ]
          resources:
            requests:
              storage: 1Gi
          storageClassName: local-path

      templates:
      - name: install-dependencies
        script:
          image: python:3.10
          volumeMounts:
          - name: tmpdir
            mountPath: /tmp
          command: [bash]
          source: |
            python -m venv /tmp/venv
            /tmp/venv/bin/pip install numpy matplotlib

      - name: pre-processing
        inputs:
          parameters:
            - name: start
            - name: stop
            - name: step
        script:
          image: python:3.10
          volumeMounts:
          - name: tmpdir
            mountPath: /tmp
          command: [/tmp/venv/bin/python]
          source: |
            import numpy as np
            import json
            start = {{inputs.parameters.start}}
            stop = {{inputs.parameters.stop}}
            step = {{inputs.parameters.step}}

            vals = np.arange(start,stop,step).tolist()
            with open("/tmp/data.json", "w") as f:
              json.dump(vals, f)
        outputs:
          artifacts:
          - name: gridPoints
            path: /tmp/data.json
            archive:
              none: { }

      - name: plot-the-figure
        script:
          image: python:3.10
          volumeMounts:
          - name: tmpdir
            mountPath: /tmp
          command: [/tmp/venv/bin/python]
          source: |
            import matplotlib.pyplot as plt
            from math import sin
            import json

            with open("/tmp/data.json", "r") as f:
              x = json.load(f)
            y = [sin(val) for val in x]
            plt.plot(x,y)
            plt.savefig("/tmp/output_fig.png")
        outputs:
          artifacts:
          - name: sin-figure
            path: "/tmp/output_fig.png"
            archive:
              none: { }

      - name: workflow-entry
        dag:
          tasks:
          - name: install-dependencies
            template: install-dependencies

          - name: pre-processing
            dependencies: [install-dependencies]
            template: pre-processing
            arguments:
              parameters:
              - name: start
                value: "{{workflow.parameters.start}}"
              - name: stop
                value: "{{workflow.parameters.stop}}"
              - name: step
                value: "{{workflow.parameters.step}}"

          - name: plot-figure
            dependencies: [pre-processing]
            template: plot-the-figure
    ```

