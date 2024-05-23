# Trigger with a Webhook Sensor

The basic workflows installation inside the virtual cluster comes with

- event controllers for event-source, event-bus and sensor
- a event bus
- a webhook event-source

For the event-source to be able to consume requests over HTTP,
we need to forward the port on 12000:

```sh
vcluster connect workflows-cluster -- kubectl -n events port-forward $(vcluster connect workflows-cluster -- kubectl -n events get pod -l eventsource-name=webhook -o name) 12000:12000 &
```

After deploying a simple webhook sensor

```sh
vcluster connect workflows-cluster -- kubectl -n events apply -f https://raw.githubusercontent.com/argoproj/argo-events/stable/examples/sensors/webhook.yaml
```

we can send a message to ```http://localhost:12000/example```:

```sh
curl -d '{"message":"this is my first webhook"}' -H "Content-Type: application/json" -X POST http://localhost:12000/example
```

Now, we should see a new workflow beeing created

```sh
vcluster connect workflows-cluster -- kubectl -n events get workflow
```

We can also use the ```argo``` CLI to look at the logs of the latest workflow

```sh
vcluster connect workflows-cluster -- argo logs -n events @latest
```

!!! note

    Once we an ingress set up, we should be able to send messages to e.g. ```workflows.diamond.ac.uk/triggering/example```
    which would also make any port-forwarding obsolete.
