import conditionalStepsTemplate from "./conditionalStepsTemplate.json";
import e02Mib2xTemplate from "./e02Mib2xTemplate.json";
import httomoCorSweepTemplate from "./httomoCorSweepTemplate.json";
import fallbackTemplate from "./fallbackTemplate.json";
import notebookTemplate from "./notebookTemplate.json";
import ptychoTomoJobTemplate from "./ptychoTomoJobTemplate.json";
import sinSimulateTemplate from "./sinSimulateArtifactTemplate.json";
import { TemplateViewQuery$data } from "relay-workflows-lib/lib/views/__generated__/TemplateViewQuery.graphql";
import { SubmissionFormFragment$key } from "relay-workflows-lib/lib/components/__generated__/SubmissionFormFragment.graphql";

export const templateViewResponse: Record<string, TemplateViewQuery$data> = {
  "conditional-steps": {
    workflowTemplate:
      conditionalStepsTemplate as unknown as SubmissionFormFragment$key,
  },
  "e02-mib2x": {
    workflowTemplate: e02Mib2xTemplate as unknown as SubmissionFormFragment$key,
  },
  "httomo-cor-sweep": {
    workflowTemplate:
      httomoCorSweepTemplate as unknown as SubmissionFormFragment$key,
  },
  notebook: {
    workflowTemplate: notebookTemplate as unknown as SubmissionFormFragment$key,
  },
  "ptycho-tomo-job": {
    workflowTemplate:
      ptychoTomoJobTemplate as unknown as SubmissionFormFragment$key,
  },
  "sin-simulate-artifact": {
    workflowTemplate:
      sinSimulateTemplate as unknown as SubmissionFormFragment$key,
  },
};

export const templateFallbackResponse: TemplateViewQuery$data = {
  workflowTemplate: fallbackTemplate as unknown as SubmissionFormFragment$key,
};
