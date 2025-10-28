import { graphql, HttpResponse } from "msw";
import { setupWorker } from "msw/browser";
import {
  MockRenderSubmittedMessageQuery$data,
  MockRenderSubmittedMessageQuery$variables,
} from "./mock-queries/__generated__/MockRenderSubmittedMessageQuery.graphql";
import {
  SingleWorkflowViewQuery$data,
  SingleWorkflowViewQuery$variables,
} from "../lib/views/__generated__/SingleWorkflowViewQuery.graphql";
import { singleWorkflowViewQueryResponse } from "dashboard/src/mocks/responses/workflows/SingleWorkflowViewQueryResponse";
import {
  TemplatesListViewQuery$data,
  TemplatesListViewQuery$variables,
} from "../lib/views/__generated__/TemplatesListViewQuery.graphql";

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
  api.query<TemplatesListViewQuery$data, TemplatesListViewQuery$variables>(
    "TemplatesListViewQuery",
    () => {
      return HttpResponse.json({
        data: {
          workflowTemplates: {
            nodes: [
              {
                name: "Template Name",
                description: "Description of template.\n",
                title: "Template Title",
                maintainer: "Name of maintainer",
                repository:
                  "https://github.com/repository-of-workflow-template",
              },
              {
                name: "conditional-steps",
                description:
                  "Run steps based on conditions from previous outputs.\n",
                title: "conditional-steps",
                maintainer: "example-manifests-group",
                repository: "https://github.com/DiamondLightSource/workflows",
              },
            ],
          },
        } as unknown as TemplatesListViewQuery$data,
        } as unknown as TemplatesListViewQuery$data,
      });
    },
  ),
  api.query<SingleWorkflowViewQuery$data, SingleWorkflowViewQuery$variables>(
    "SingleWorkflowViewQuery",
    () => {
      return HttpResponse.json({
        data: singleWorkflowViewQueryResponse as unknown as SingleWorkflowViewQuery$data,
      });
    },
  ),
];

export const server = setupWorker(...handlers);
