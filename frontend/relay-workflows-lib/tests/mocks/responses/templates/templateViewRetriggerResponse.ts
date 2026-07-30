import fallbackRetriggerResponse from "./fallbackRetriggerResponse.json";
import e02Mib2xRetriggerResponse from "./e02Mib2xRetriggerResponse.json";
import conditionalStepsRetrigger from "./conditionalStepsRetrigger.json";
import { SubmissionFormParametersFragment$key } from "relay-workflows-lib/lib/components/__generated__/SubmissionFormParametersFragment.graphql";
import { TemplateViewRetriggerQuery$data } from "relay-workflows-lib/lib/views/__generated__/TemplateViewRetriggerQuery.graphql";

export const templateRetriggerResponse: Record<
  string,
  TemplateViewRetriggerQuery$data
> = {
  "mg:36964-1:mg-template-for-conditional-steps-first:12345": {
    workflowById:
      conditionalStepsRetrigger as unknown as SubmissionFormParametersFragment$key,
  },
  "mg36964-1:e02-mib2x:54321": {
    workflowById:
      e02Mib2xRetriggerResponse as unknown as SubmissionFormParametersFragment$key,
  },
};

export const templateFallbackRetriggerResponse: TemplateViewRetriggerQuery$data =
  {
    workflowById:
      fallbackRetriggerResponse as unknown as SubmissionFormParametersFragment$key,
  };
