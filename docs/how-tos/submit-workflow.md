# Submit a Workflow

## Preface

This guide will describe how to configure and submit a workflow that is then running in the namespace of a Diamond visit.
The easiest way to run your application as a workflow is by using containers.
We therefore recommmend that you build a container for your application and push it to a container registry.
Check the Diamond developer portal for more details on
[Working with Containers](https://dev-guide.diamond.ac.uk/kubernetes/tutorials/containers/).

## Workflow

Workflows can be configured as YAML manifests that include an ```apiVersion```,
declare the ```kind``` and ```Workflow```, and are given a ```name``` in ```metadata```:

```yaml
    apiVersion: argoproj.io/v1alpha1
    kind: Workflow
    metadata:
      name: name-of-the-workflow
```

We can then define a list of tasks as ```spec.templates[]``` and declare an ```entrypoint```.
A task could be specified by a ```container``` with a given ```image``` and ```command```:

```yaml
    spec:
      entrypoint: hello-world-example
      templates:
      - name: hello-world-example
        container:
          image: docker.io/library/busybox:latest
          command: 
          - echo
          - Hello world
```

You can find more detailed information in the
[Argo Workflows](https://argo-workflows.readthedocs.io/en/latest/workflow-concepts/)
documentation.

!!! example "Hello world"

    A Workflow executing a `busybox` instance which prints "Hello world":

    ```yaml
    apiVersion: argoproj.io/v1alpha1
    kind: Workflow
    metadata:
      name: hello-world-example
    spec:
      entrypoint: hello-world-example
      templates:
      - name: hello-world-example
        container:
          image: docker.io/library/busybox:latest
          command: 
          - echo
          - Hello world
    ```

## Workflow with parameters

Instead of hard-coding the message into the workflow, we can define a parameter ```message``` and
modify the ```command``` to reference our parameter using ```{{ inputs.parameters.message }}```:

```yaml
    spec:
      entrypoint: hello-world-example
      templates:
      - name: hello-world-example
        inputs:
          parameters:
          - name: message
        container:
          image: docker.io/library/busybox:latest
          command: 
          - echo
          - {{inputs.parameters.message }}
```

We can then provide a message at runtime as a parameter when we submit the workflow.
You can find more parametrized workflow examples in the
[Argo Workflows](https://argo-workflows.readthedocs.io/en/latest/workflow-templates/)
documentation.

## Using the Argo dashboard to submit a workflow

To access the Argo workflows dashboard, visit [https://workflows.diamond.ac.uk](https://workflows.diamond.ac.uk)
and login with your Diamond credentials. It should open the dashboard in the workflows tab:

![](argo_dashboard_start.png)

!!! note Namespace

    A workflow can only by submitted within a namespace. For now, the available namespaces are all of Diamond's visits. 
    In the future, we anticipate to also add other namespaces, e.g. user/fedid

After specifying the namespace in which you would like your workflow to be executed, you can click on
```+ SUBMIT NEW WORKFLOW``` which should give you a prompt
that allows you to either select an existing template or edit a default template:

![](argo_dashboard_select.png)

On the edit page, you can modify an existing template or copy/paste the ```hello world``` example from above into
manifest section:

![](argo_dashboard_workflow.png)

Once you are happy with the manifest and the parameters, you can submit the workflow by clicking on
```+ CREATE``` which then brings you to a new page showing a pending workflow:

![](argo_dashboard_pending.png)

You can click on the icon in the centre to inspect your workflow and its status. Once the workflow
has successfully finished, it should look like this:

![](argo_dashboard_success.png)

!!! note

    As you might have realised the UI/UX of this argo dashboard has its limitations. 
    We are planning to provide a more simple and intuitive web-interface for workflows in the near future. 

## Using the Argo CLI to submit a workflow

See the official documentation for the [Workflows CLI](https://argo-workflows.readthedocs.io/en/latest/).

!!! note
    The workflows CLI is officially called `argo`. We provide a more convenient alias `awf` as part of the module to clarify any confusion between the workflows platform and argocd. The workflow CLI can be used by calling both `awf` and `argo`.

# Getting Started

Use the module system to load all the relevant tools. This will give you the latest supported version of the workflows CLI.

```bash
module load workflows
```

The most basic use cases are covered below

``` bash
# 'awf' can be replaced with 'argo' in all cases
awf submit hello-world.yaml    # submit a workflow spec to the workflows engine
awf list                       # list current workflows
awf get hello-world-xxx        # get info about a specific workflow
awf logs hello-world-xxx       # print the logs from a workflow
awf delete hello-world-xxx     # delete workflow
```

When submitting workflows, please use your instrumentSession ID as the namespace, eg `mg36964-1`
