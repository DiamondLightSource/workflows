import { graphql, HttpResponse } from "msw";
import {
  RetriggerWorkflowQuery$data,
  RetriggerWorkflowQuery$variables,
} from "relay-workflows-lib/lib/components/__generated__/RetriggerWorkflowQuery.graphql";
import {
  TemplateViewMutation$data,
  TemplateViewMutation$variables,
} from "relay-workflows-lib/lib/components/__generated__/TemplateViewMutation.graphql";
import {
  TemplateViewQuery$data,
  TemplateViewQuery$variables,
} from "relay-workflows-lib/lib/components/__generated__/TemplateViewQuery.graphql";
import {
  workflowsQuery$data,
  workflowsQuery$variables,
} from "relay-workflows-lib/lib/graphql/__generated__/workflowsQuery.graphql";
import {
  TemplatesListQuery$data,
  TemplatesListQuery$variables,
} from "relay-workflows-lib/lib/graphql/__generated__/TemplatesListQuery.graphql";
import templateListResponse from "./responses/templates/templateListResponse.json";
import {
  templateViewResponse,
  templateFallbackResponse,
} from "./responses/templates/templateResponses";
import workflowsListResponse from "./responses/workflows/workflowsListResponse.json";
import {
  workflowRelayQuery$data,
  workflowRelayQuery$variables,
} from "relay-workflows-lib/lib/graphql/__generated__/workflowRelayQuery.graphql";
import {
  defaultWorkflowResponse,
  workflowRelayMockResponses,
} from "./responses/workflows/workflowResponses";

const api = graphql.link("https://workflows.diamond.ac.uk/graphql");

export const handlers = [
  api.query<workflowsQuery$data, workflowsQuery$variables>(
    "workflowsQuery",
    () => {
      return HttpResponse.json({
        data: workflowsListResponse,
      });
    },
  ),

  api.query<workflowRelayQuery$data, workflowRelayQuery$variables>(
    "workflowRelayQuery",
    ({ variables }) => {
      const response =
        workflowRelayMockResponses[variables.name] ?? defaultWorkflowResponse;
      return HttpResponse.json({ data: response });
    },
  ),

  api.query<RetriggerWorkflowQuery$data, RetriggerWorkflowQuery$variables>(
    "RetriggerWorkflowQuery",
    ({ variables }) => {
      return HttpResponse.json({
        data: {
          workflow: {
            templateRef: `template-for-${variables.workflowname}`,
          },
        },
      });
    },
  ),

  api.query<TemplatesListQuery$data, TemplatesListQuery$variables>(
    "TemplatesListQuery",
    () => {
      return HttpResponse.json({
        data: templateListResponse,
      });
    },
  ),

  api.query<TemplateViewQuery$data, TemplateViewQuery$variables>(
    "TemplateViewQuery",
    ({ variables }) => {
      const response =
        templateViewResponse[variables.templateName] ??
        templateFallbackResponse;
      return HttpResponse.json({ data: response });
    },
  ),

  api.mutation<TemplateViewMutation$data, TemplateViewMutation$variables>(
    "TemplateViewMutation",
    ({ variables }) => {
      return HttpResponse.json({
        data: {
          submitWorkflowTemplate: {
            name: `${variables.visit.proposalCode}-${variables.templateName}`,
          },
        },
      });
    },
  ),
];
