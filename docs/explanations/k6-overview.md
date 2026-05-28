Main files are in charts/k6-operator 

* Main changes made for k6:
    - Allow machine account authentication @charts/workflows-cluster/values#186 
    - Add scrape job for prometheus for k6 metrics @charts/otel-collector/values.yaml#92 
    - Add myself to Grafana as admin @charts/monitoring/values.yaml#50 
    - hourly CronJob creates the WebSocket synthetic probe TestRun

Synthetic probe success proves:

- auth works, GraphQL mutation works, workflow execution starts, WebSocket subscription emits updates, workflow succeeds.

How to identify failed tests:
as of right now, the most reliable way is to inspect the logs of the test's pods in argo-cd. Identifying test successes is same. for example, in the ping-graph test the expected (i.e successful) output is somewhere along the lines of
`level=info msg="body={\"data\":{\"workflows\":{\"edges\":[{\"node\":{\"name\":\"example-template-2ctkk\",\"status\":{\"__typename\":\"WorkflowSucceededStatus\"}}},{\ ....."`
with the end of the test printing:
```

  █ TOTAL RESULTS
 
    checks_total.......: 1       0.001923/s
    checks_succeeded...: 100.00% 1 out of 1
    checks_failed......: 0.00%   0 out of 1
 
    ✓ keycloak token request succeeded
 
    HTTP
    http_req_duration..............: avg=759.38ms min=9.08ms med=78.24ms max=1m0s   p(90)=126.57ms p(95)=187.29ms
      { expected_response:true }...: avg=244.64ms min=9.08ms med=77.77ms max=59.96s p(90)=119.68ms p(95)=177.96ms
    http_req_failed................: 0.86% 281 out of 32621
    http_reqs......................: 32621 62.739816/s
 
    EXECUTION
    iteration_duration.............: avg=759.81ms min=9.4ms  med=78.68ms max=1m0s   p(90)=126.96ms p(95)=187.69ms
    iterations.....................: 32620 62.737892/s
    vus............................: 3     min=0            max=249
    vus_max........................: 250   min=250          max=250
 
    NETWORK
    data_received..................: 99 MB 189 kB/s
    data_sent......................: 66 MB 127 kB/s

```
The OpenTelemetry/Grafana integration is not rich enough/polished enough to where it can be considered a source of truth. Although with some configuration/editing, a Grafana dashboard can be used to identify test successes/failures with details on failure modes etc.


How to rerun a test:
The easiest way is to delete the TestRun  resource in ArgoCD. ArgoCD will resync the TestRun. K6 will then rerun the test

K6 relavant docs links:

1. https://grafana.com/docs/k6/latest/using-k6/
1. https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/
1. https://grafana.com/docs/k6/latest/using-k6/test-lifecycle/#setup-and-teardown-stages (why setup() is used in common.ts )
1. k6 testing guides: https://grafana.com/docs/k6/latest/testing-guides/

notes for future maintainers:

1. k6 scripts are TypeScript but shipped through ConfigMap.
1. synthetic probe is driven by a Kubernetes CronJob that applies a TestRun manifest from a ConfigMap.
1. common.ts is where shared key cloak token request lives. to use this function, export setup() in your .ts  file. setup is always run before your test (see setup docs link)

Assumptions in the tests:

1. visit { proposalCode: "ks", proposalNumber: 10000, number: 1 }
1. template example-template in ws-subscription.ts

These are hardcoded values, so they may cause issues/be brittle in the future.

How to add a test:

1. write test (look at example ping-graph.ts,  ws-subscription.ts or https://grafana.com/docs/k6/latest/get-started/write-your-first-test/)
1. create respective configMap for test (`charts/k6-operator/templates` or https://grafana.com/docs/k6/latest/set-up/set-up-distributed-k6/usage/executing-k6-scripts-with-testrun-crd/)

Pain points:
- Failures may entirely be due to kyverno not syncing state properly. Ensure Rolebindings have been applied correctly by kyverno


Future tests/to-do:

1. Artifact verification
1. write config-map/test spam-workflows.ts 
1. have rich telemetry/metrics output for grafana 

    1. https://grafana.com/docs/k6/latest/results-output/real-time/opentelemetry/
    1. use Check ( charts/k6-operator/tests/ws-subscription.ts#78  or https://grafana.com/docs/k6/latest/using-k6/checks/)
    1. use Rate (https://grafana.com/docs/k6/latest/javascript-api/k6-metrics/rate/, charts/k6-operator/tests/ws-subscription.ts#12
