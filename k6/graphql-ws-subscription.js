import ws from "k6/ws";
import { check, fail } from "k6";

function requiredEnv(name) {
  const value = __ENV[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const workflowSubscription = `
  subscription K6WorkflowSubscription($visit: VisitInput!, $name: String!) {
    workflow(visit: $visit, name: $name) {
      name
      status {
        __typename
      }
    }
  }
`;

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  const url = requiredEnv("GRAPHQL_WS_URL");
  const token = requiredEnv("AUTH_TOKEN");
  const workflowName = requiredEnv("WORKFLOW_NAME");
  const visit = {
    proposalCode: requiredEnv("VISIT_PROPOSAL_CODE"),
    proposalNumber: Number(requiredEnv("VISIT_PROPOSAL_NUMBER")),
    number: Number(requiredEnv("VISIT_NUMBER")),
  };

  let sawAck = false;
  let sawNext = false;
  let sawComplete = false;
  let protocolError = null;

  const response = ws.connect(
    url,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      tags: {
        endpoint: "graphql_ws",
        operation: "workflow_subscription",
        scenario: "graphql_ws_subscription",
      },
    },
    function (socket) {
      socket.on("open", function () {
        socket.send(
          JSON.stringify({
            type: "connection_init",
            payload: {
              Authorization: `Bearer ${token}`,
            },
          }),
        );
      });

      socket.on("message", function (message) {
        let frame;
        try {
          frame = JSON.parse(message);
        } catch (_err) {
          protocolError = `non-JSON websocket frame: ${message}`;
          socket.close();
          return;
        }

        if (frame.type === "connection_ack") {
          sawAck = true;
          socket.send(
            JSON.stringify({
              id: "1",
              type: "subscribe",
              payload: {
                query: workflowSubscription,
                variables: {
                  visit,
                  name: workflowName,
                },
              },
            }),
          );
          return;
        }

        if (frame.type === "next") {
          sawNext = true;
          console.log(`subscription payload=${JSON.stringify(frame.payload)}`);
          socket.send(
            JSON.stringify({
              id: "1",
              type: "complete",
            }),
          );
          socket.close();
          return;
        }

        if (frame.type === "complete") {
          sawComplete = true;
          socket.close();
          return;
        }

        if (frame.type === "error") {
          protocolError = `graphql-ws error frame: ${JSON.stringify(frame.payload)}`;
          socket.close();
        }
      });

      socket.on("error", function (err) {
        protocolError = `websocket error: ${err && err.error ? err.error() : String(err)}`;
      });

      socket.setTimeout(function () {
        if (!sawNext) {
          protocolError = "timed out waiting for subscription payload";
        }
        socket.close();
      }, Number(__ENV.K6_WS_TIMEOUT_MS || "30000"));
    },
  );

  check(response, {
    "websocket upgrade status is 101": (res) => res && res.status === 101,
  });

  if (protocolError) {
    fail(protocolError);
  }

  if (!sawAck) {
    fail("did not receive graphql-ws connection_ack");
  }

  if (!sawNext && !sawComplete) {
    fail("subscription ended without any next or complete frame");
  }
}
