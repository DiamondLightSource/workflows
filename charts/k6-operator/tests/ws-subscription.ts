import http from 'k6/http';
import { check, fail } from 'k6';
import { Options } from 'k6/options';
import * as ws from 'k6/ws';
export { setup } from './common.ts';

const graphUrl = __ENV.GRAPH_URL;
const graphWsUrl = __ENV.GRAPH_WS_URL;

interface VisitInput {
  proposalCode: string;
  proposalNumber: number;
  number: number;
}

const submitMutation = `mutation K6WsSubmit($templateName: String!, $visit: VisitInput!, $parameters: JSON!) { submitWorkflowTemplate(name: $templateName, visit: $visit, parameters: $parameters) { name } }`;
const subscriptionQuery = `subscription K6WsSubscription($visit: VisitInput!, $name: String!) { workflow(visit: $visit, name: $name) { status { __typename } } }`;

export const options: Options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

interface MutationResponse {
  data?: {
    submitWorkflowTemplate?: {
      name?: string;
      visit?: VisitInput;
      status?: string | null;
    };
  };
}



export default function(data: { token: string }): void {
  const visit: VisitInput = {
    proposalCode: "ks",
    proposalNumber: 10000,
    number: 1
  }
  const templateName = "example-template"
  //if (!templateName) fail('WS_TEMPLATE_NAME or TINY_TEMPLATE_NAME required');
  //const parameters = optionalJsonEnv('K6_WS_SUBMISSION_PARAMETERS');
  const parameters = {}

  const submitResponse = http.post(
    graphUrl,
    JSON.stringify({
      query: submitMutation,
      variables: {
        templateName,
        visit,
        parameters,
      },
    }),
    {
      headers: {
        Authorization: `Bearer ${data.token}`,
      },
      tags: {
        endpoint: "graphql",
        operation: "submit_workflow_template",
        scenario: "graphql_ws_subscription",
      },
    },
  );

  check(submitResponse, {
    "submit mutation status is 200": (res) => res && res.status === 200,
  })
  let submitBody: MutationResponse | undefined = undefined;
  try {
    submitBody = submitResponse.json() as MutationResponse;
  } catch (_err) {
    fail(`submit mutation returned non-JSON body. Status=${submitResponse.status}`);
  }

  if (!submitBody || typeof submitBody !== "object" || Array.isArray(submitBody)) {
    fail(`submit mutation returned errors: Status=${(submitResponse.status)}`);
  }

  const workflowName = submitBody?.data?.submitWorkflowTemplate?.name;
  if (!workflowName) {
    fail(`submit mutation returned no workflows name. Status=${submitResponse.status}`);
  }

  const timeoutSeconds = Number(__ENV.K6_POLL_TIMEOUT_SECONDS || '300');
  let connectionAck = false;
  let nextCount = 0;
  let terminalStatus: string | null = null;
  let timedOut = false;

  if (!graphWsUrl) {
    fail("GRAPH_WS_URL required");
  }
  const response = ws.connect(
    graphWsUrl,
    {
      headers: {
        Authorization: `Bearer ${data.token}`,
        'Sec-WebSocket-Protocol': 'graphql-transport-ws',
      },
      tags: { endpoint: 'graphql_ws', scenario: 'ws_subscription' },
    },
    (socket) => {
      socket.on('open', () => {
        socket.send(JSON.stringify({ type: 'connection_init', payload: { Authorization: `Bearer ${data.token}` } }));
        socket.setTimeout(() => {
          timedOut = true;
          socket.close();
        }, timeoutSeconds * 1000);
      });

      socket.on('message', (message) => {
        const frame = JSON.parse(message) as {
          type: string;
          payload?: { data?: { workflow?: { status?: { __typename?: string } } } };
        };
        if (frame.type === 'connection_ack') {
          connectionAck = true;
          socket.send(JSON.stringify({
            id: '1',
            type: 'subscribe',
            payload: {
              operationName: 'K6WsSubscription',
              query: subscriptionQuery,
              variables: { visit, name: workflowName },
            },
          }));
          return;
        }
        if (frame.type === 'next') {
          nextCount += 1;
          terminalStatus = frame.payload?.data?.workflow?.status?.__typename || null;
          if (
            terminalStatus === 'WorkflowSucceededStatus' ||
            terminalStatus === 'WorkflowFailedStatus' ||
            terminalStatus === 'WorkflowErroredStatus'
          ) {
            socket.send(JSON.stringify({ id: '1', type: 'complete' }));
            socket.close();
          }
        }
      });
    },
  );

  check(response, {
    'websocket upgrade succeeded': (r) => r.status === 101,
  });
  check({ connectionAck, nextCount, terminalStatus, timedOut }, {
    'websocket connection acknowledged': (state) => state.connectionAck,
    'websocket emitted updates': (state) => state.nextCount > 0,
    'subscription saw workflow reach terminal success': (state) =>
      state.terminalStatus === 'WorkflowSucceededStatus',
    'websocket did not time out': (state) => !state.timedOut,
  });
}
