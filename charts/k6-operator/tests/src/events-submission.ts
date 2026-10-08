import http from "k6/http";
import { check, fail, sleep } from "k6";
export { setup } from "./common.ts";
import { Gauge } from "k6/metrics";

const graphUrl = __ENV.GRAPH_URL;
const testFail = new Gauge("synthetic_probe_failing");

type WorkflowStatusType =
  | "Unknown"
  | "WorkflowPendingStatus"
  | "WorkflowRunningStatus"
  | "WorkflowSucceededStatus"
  | "WorkflowFailedStatus"
  | "WorkflowErroredStatus";

interface WorkflowStatus {
  _typename: WorkflowStatusType;
  startTime?: string;
}

interface WorkflowsQueryResponse {
  data?: {
    workflows?: {
      nodes: Workflow[];
    };
  };
}

interface Workflow {
  id: string;
  name: string;
  status?: WorkflowStatus;
}

/// Cause the synthetic probe to fail, attaching the reason as a label
function failTest(reason: string): never {
  testFail.add(true, {
    probe: "events-submission",
    reason: reason,
  });
  fail(reason);
}

/// Posts to the test webhook service endpoint to trigger a workflow with argument `input`
function triggerWebhook(input: string): void {
  const url =
    "http://webhook-test-eventsource-svc.events.svc.cluster.local:12000/example";

  let body = JSON.stringify({
    doc: { instrument_session: "ks10000-1" },
    parameters: { input: input },
  });
  const postResponse = http.post(url, body);
  check(postResponse, {
    "webhook response is 200": (res) => res && res.status === 200,
  });
  if (postResponse.status !== 200) {
    failTest("workflows query response had an unexpected format");
  }
}

/// Returns the most recent workflow ran for the k6 test trigger
function getLastWorkflow(token: string) {
  const getWorkflowQuery = `
  {
    workflows(
      visit: {proposalCode: "ks", proposalNumber: 10000, number: 1}
      filter: {labelSelectors: [{key: "events.argoproj.io/trigger", values: ["k6-test-trigger"], operator: EQ}]}
      limit: 1
    ) {
      nodes {
        id
        status {
          __typename
          ... on WorkflowRunningStatus {
            startTime
          }
          ... on WorkflowSucceededStatus {
            startTime
          }
        }
      }
    }
  }
  `;

  const workflowResponse = http.post(
    graphUrl,
    JSON.stringify({ query: getWorkflowQuery }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );
  check(workflowResponse, {
    "workflow query status is 200": (res) => res && res.status === 200,
  });
  let response: WorkflowsQueryResponse | undefined = undefined;
  try {
    response = workflowResponse.json() as WorkflowsQueryResponse;
  } catch {
    failTest("workflows query response had an unexpected format");
  }
  return response;
}

/// Converts the creationTime of a workflow to the hour it ran at
/// E.g. "2026-10-07T09:06:32Z" -> 9
function parseStartTime(datestring: string): number {
  const date = new Date(datestring);
  return date.getUTCHours();
}

export default function (data: { token: string }): void {
  const date = new Date();
  const time = date.getUTCHours();
  triggerWebhook(time.toString());
  sleep(10);

  const response = getLastWorkflow(data.token);

  if (response.data?.workflows?.nodes.length != 1) {
    failTest(
      `unexpected number of workflows returned in query: expected 1, got ${response.data?.workflows?.nodes.length}`,
    );
  }

  const startTime: string | undefined =
    response.data.workflows.nodes[0].status?.startTime;
  if (!startTime) {
    failTest("the workflow start time could not be determined");
  }

  if (parseStartTime(startTime) !== time) {
    failTest("the workflow failed to run");
  }

  testFail.add(false, { probe: "events-submission" });
}
