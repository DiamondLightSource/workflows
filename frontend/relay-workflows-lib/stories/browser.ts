import { graphql, HttpResponse } from "msw";
import { setupWorker } from "msw/browser";
import {
  MockRenderSubmittedMessageQuery$data,
  MockRenderSubmittedMessageQuery$variables,
} from "./mock-queries/__generated__/MockRenderSubmittedMessageQuery.graphql";

const api = graphql.link("https://workflows.diamond.ac.uk/graphql");

const handlers = [
  api.query<
    MockRenderSubmittedMessageQuery$data,
    MockRenderSubmittedMessageQuery$variables
  >("MockRenderSubmittedMessageQuery", ({ variables }) => {
    switch (variables.name) {
      case "completed-workflow":
        return HttpResponse.json({
          data: {
            workflow: {
              status: {
                __typename: "WorkflowSucceededStatus",
              },
            },
          } as unknown as MockRenderSubmittedMessageQuery$data,
        });
      case "running-workflow":
        return HttpResponse.json({
          data: {
            workflow: {
              status: {
                __typename: "WorkflowRunningStatus",
              },
            },
          } as unknown as MockRenderSubmittedMessageQuery$data,
        });
      case "pending-workflow":
        return HttpResponse.json({
          data: {
            workflow: {
              status: {
                __typename: "WorkflowPendingStatus",
              },
            },
          } as unknown as MockRenderSubmittedMessageQuery$data,
        });
      case "errored-workflow":
        return HttpResponse.json({
          data: {
            workflow: {
              status: {
                __typename: "WorkflowErroredStatus",
              },
            },
          } as unknown as MockRenderSubmittedMessageQuery$data,
        });
      default:
        return HttpResponse.json({
          data: {
            workflow: {
              status: {
                __typename: "Unknown",
              },
            },
          } as unknown as MockRenderSubmittedMessageQuery$data,
        });
    }
  }),
];

export const server = setupWorker(...handlers);
