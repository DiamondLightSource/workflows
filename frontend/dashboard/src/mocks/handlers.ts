import { graphql, HttpResponse } from "msw";
import {
  RetriggerWorkflowQuery$data,
  RetriggerWorkflowQuery$variables,
} from "relay-workflows-lib/lib/query-components/__generated__/RetriggerWorkflowQuery.graphql";
import {
  TemplateViewMutation$data,
  TemplateViewMutation$variables,
} from "relay-workflows-lib/lib/views/__generated__/TemplateViewMutation.graphql";
import {
  TemplateViewQuery$data,
  TemplateViewQuery$variables,
} from "relay-workflows-lib/lib/views/__generated__/TemplateViewQuery.graphql";
import {
  workflowsQuery$data,
  workflowsQuery$variables,
} from "relay-workflows-lib/lib/graphql/__generated__/workflowsQuery.graphql";
import {
  TemplatesListViewQuery$data,
  TemplatesListViewQuery$variables,
} from "relay-workflows-lib/lib/views/__generated__/TemplatesListViewQuery.graphql";
import templateListResponse from "./responses/templates/templateListResponse.json";
import {
  templateViewResponse,
  templateFallbackResponse,
} from "./responses/templates/templateResponses";
import {
  templateRetriggerResponse,
  templateFallbackRetriggerResponse,
} from "./responses/templates/templateViewRetriggerResponse";
import workflowsListResponse from "./responses/workflows/workflowsListResponse.json";
import {
  workflowRelayQuery$data,
  workflowRelayQuery$variables,
} from "relay-workflows-lib/lib/graphql/__generated__/workflowRelayQuery.graphql";
import {
  defaultWorkflowResponse,
  workflowRelayMockResponses,
} from "./responses/workflows/workflowResponses";
import {
  WorkflowsListViewTemplatesQuery$data,
  WorkflowsListViewTemplatesQuery$variables,
} from "relay-workflows-lib/lib/views/__generated__/WorkflowsListViewTemplatesQuery.graphql";
import { workflowsListViewTemplatesResponse } from "./responses/templates/workflowsListViewTemplates";
import { workflowsListViewQueryResponse } from "./responses/workflows/WorkflowsListViewQueryResponse";
import {
  WorkflowsListViewQuery$data,
  WorkflowsListViewQuery$variables,
} from "relay-workflows-lib/lib/views/__generated__/WorkflowsListViewQuery.graphql";
import {
  SingleWorkflowViewQuery$data,
  SingleWorkflowViewQuery$variables,
} from "relay-workflows-lib/lib/views/__generated__/SingleWorkflowViewQuery.graphql";
import { singleWorkflowViewQueryResponse } from "./responses/workflows/SingleWorkflowViewQueryResponse";
import {
  TemplateViewRetriggerQuery$data,
  TemplateViewRetriggerQuery$variables,
} from "relay-workflows-lib/lib/views/__generated__/TemplateViewRetriggerQuery.graphql";

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

  api.query<
    WorkflowsListViewTemplatesQuery$data,
    WorkflowsListViewTemplatesQuery$variables
  >("WorkflowsListViewTemplatesQuery", () => {
    return HttpResponse.json({
      data: workflowsListViewTemplatesResponse as unknown as WorkflowsListViewTemplatesQuery$data,
    });
  }),

  api.query<WorkflowsListViewQuery$data, WorkflowsListViewQuery$variables>(
    "WorkflowsListViewQuery",
    () => {
      return HttpResponse.json({
        data: workflowsListViewQueryResponse as unknown as WorkflowsListViewQuery$data,
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

  api.query<TemplatesListViewQuery$data, TemplatesListViewQuery$variables>(
    "TemplatesListViewQuery",
    () => {
      return HttpResponse.json({
        data: templateListResponse as unknown as TemplatesListViewQuery$data,
      });
    },
  ),

  api.query<
    TemplateViewRetriggerQuery$data,
    TemplateViewRetriggerQuery$variables
  >("TemplateViewRetriggerQuery", ({ variables }) => {
    const response =
      templateRetriggerResponse[variables.workflowName] ??
      templateFallbackRetriggerResponse;
    return HttpResponse.json({ data: response });
  }),

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
