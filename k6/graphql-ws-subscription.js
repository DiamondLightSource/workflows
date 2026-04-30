import http from "k6/http";
import ws from "k6/ws";
import { check, fail } from "k6";

function normalizeWsUrl(url) {
  if (url.startsWith("https://")) {
    return `wss://${url.slice("https://".length)}`;
  }
  if (url.startsWith("http://")) {
    return `ws://${url.slice("http://".length)}`;
  }
  return url;
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

const submitWorkflowMutation = `
  mutation sendWorkflow($name: String!, $visit: VisitInput!, $parameters: JSON!) {
    submitWorkflowTemplate(name: $name, visit: $visit, parameters: $parameters) {
      name
      visit {
        proposalCode
        proposalNumber
        number
      }
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
  const graphqlUrl = "https://staging.workflows.diamond.ac.uk/graphql";
  const url = normalizeWsUrl(
    "wss://staging.workflows.diamond.ac.uk/graphql/ws",
  );
  const token =
    "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJnTk5XYWVHTXFDWE1QY0l3eDA4ZjBsV18wcE9EX1MwV1lGeEZqbXZ0RU1RIn0.eyJleHAiOjE3NzU2NTI1NzYsImlhdCI6MTc3NTY1MTY3NiwiYXV0aF90aW1lIjoxNzc1NjUxMjA2LCJqdGkiOiJvbnJ0YWM6MjkxYmM2ZGMtYzQ1Yy01Mzc3LTkzMzgtMWYwYjc1YTIxOTBiIiwiaXNzIjoiaHR0cHM6Ly9pZGVudGl0eS1kZXYuZGlhbW9uZC5hYy51ay9yZWFsbXMvZGxzIiwiYXVkIjpbIndvcmtmbG93cy1jbHVzdGVyLXN0YWdpbmciLCJhY2NvdW50Il0sInN1YiI6IjllZjg2ZGQ5LWUyN2MtNGNkNS1iNzc3LTY0NDI5MDA2YWUxMCIsInR5cCI6IkJlYXJlciIsImF6cCI6IndvcmtmbG93cy11aS1kZXYiLCJzaWQiOiI3M2E3ZmY0OS0wNTIxLTQ3MzItYTQ1ZS04MjcxZDQ5OGFmNTgiLCJhY3IiOiIwIiwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbImRlZmF1bHQtcm9sZXMtZGxzIiwib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIGZlZGlkIGVtYWlsIHByb2ZpbGUgcG9zaXgtdWlkIiwicG9zaXhfdWlkIjoiMTIzMzM1MyIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwibmFtZSI6Ik1haGlyIEFiYmFzIiwicHJlZmVycmVkX3VzZXJuYW1lIjoidW1pMTM4MjciLCJmZWRpZCI6InVtaTEzODI3IiwiZ2l2ZW5fbmFtZSI6Ik1haGlyIiwiZmFtaWx5X25hbWUiOiJBYmJhcyIsImVtYWlsIjoibWFoaXIuYWJiYXNAZGlhbW9uZC5hYy51ayJ9.LfeK504mu1xAAgGHRPR7_JC-uIgwcINprqVZWMQ9VOFRV8pN1K4VlogZNm3B-4IjPPfRJnIiYWTVY9bg_4gXO0X84uwHyR3XwdC4escBuOUTzMf0Jsayn1jQMfrm6sTSK0EpBwfaAzK4JUy7nFvcGBsa2OsZ7cUfYfy_ik8etM4kiT3J1RnSHqb6x_8qLCyjsNpTZryzDtu819oys79R-ZoRnxXwjFvcHHFQcl_b0GqObLLAQwehnob59Wf9o_BEOoI8GlKMuI_J5K3lbaF214YW1CxdupTyXDlX23PMvjXbjvtf3yiSaDztTP7VFhyvcL4rD2gDTT3wUgOpggERJg";
  const templateName = "conditional-steps";
  const parameters = {};
  const visit = {
    proposalCode: "cm",
    proposalNumber: 40661,
    number: 1,
  };
  const submitResponse = http.post(
    graphqlUrl,
    JSON.stringify({
      query: submitWorkflowMutation,
      variables: {
        name: templateName,
        visit,
        parameters,
      },
    }),
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept:
          "application/graphql-response+json; charset=utf-8, application/json; charset=utf-8",
        "Content-Type": "application/json",
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
  });

  let submitBody = null;
  try {
    submitBody = submitResponse.json();
  } catch (_err) {
    fail(`submit mutation returned non-JSON body. Status=${submitResponse.status}`);
  }

  if (submitBody.errors && submitBody.errors.length > 0) {
    fail(`submit mutation returned errors: ${JSON.stringify(submitBody.errors)}`);
  }

  const workflowName =
    submitBody &&
    submitBody.data &&
    submitBody.data.submitWorkflowTemplate &&
    submitBody.data.submitWorkflowTemplate.name;

  if (!workflowName) {
    fail(`submit mutation did not return a workflow name: ${JSON.stringify(submitBody)}`);
  }

  console.log(`submitted workflow=${workflowName}`);

  let sawAck = false;
  let sawNext = false;
  let sawComplete = false;
  let protocolError = null;
  let reachedTerminalStatus = false;
  let lastStatusTypename = null;

  const response = ws.connect(
    url,
    {
      headers: {
        "Sec-WebSocket-Protocol": "graphql-transport-ws",
      },
      tags: {
        endpoint: "graphql_ws",
        operation: "workflow_subscription",
        scenario: "graphql_ws_subscription",
      },
    },
    function (socket) {
      socket.on("open", function () {
        console.log(`connected to ${url}`);
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
        console.log(`frame=${message}`);
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
          const status =
            frame.payload &&
            frame.payload.data &&
            frame.payload.data.workflow &&
            frame.payload.data.workflow.status;
          const statusTypename = status && status.__typename;

          if (statusTypename) {
            lastStatusTypename = statusTypename;
            console.log(`workflow status=${statusTypename}`);
          }

          if (
            statusTypename === "WorkflowSucceededStatus" ||
            statusTypename === "WorkflowFailedStatus" ||
            statusTypename === "WorkflowErroredStatus"
          ) {
            reachedTerminalStatus = true;
            socket.send(
              JSON.stringify({
                id: "1",
                type: "complete",
              }),
            );
            socket.close();
          }
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
        } else if (!reachedTerminalStatus) {
          protocolError = `timed out before terminal workflow status; last status=${lastStatusTypename}`;
        }
        socket.close();
      }, 600000);
    },
  );

  check(response, {
    "websocket upgrade status is 101": (res) => res && res.status === 101,
  });

  if (!response || response.status !== 101) {
    fail(`websocket upgrade failed with status=${response ? response.status : "unknown"}`);
  }

  if (protocolError) {
    fail(protocolError);
  }

  if (!sawAck) {
    fail("did not receive graphql-ws connection_ack");
  }

  if (!sawNext && !sawComplete) {
    fail("subscription ended without any next or complete frame");
  }

  if (!reachedTerminalStatus) {
    fail(`subscription ended before terminal workflow status; last status=${lastStatusTypename}`);
  }
}
