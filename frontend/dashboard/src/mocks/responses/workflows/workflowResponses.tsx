import { workflowRelayQuery$data } from "relay-workflows-lib/lib/graphql/__generated__/workflowRelayQuery.graphql";
import conditionalStepsFirst from "./conditional-steps-first.json";
import conditionalStepsSecond from "./conditional-steps-second.json";
import conditionalStepsThird from "./conditional-steps-third.json";
import mountTmpdirFirst from "./mount-tmpdir-first.json";
import notebookFirst from "./notebook-first.json";
import notebooksSecond from "./notebook-second.json";
import ptychoTomoJobFirst from "./ptycho-tomo-job-first.json";
import ptychoTomoJobSecond from "./ptycho-tomo-job-second.json";
import ptychoTomoJobThird from "./ptycho-tomo-job-third.json";
import sinSimulateArtifactFirst from "./sin-simulate-artifact-first.json";

export const workflowRelayMockResponses: Record<
  string,
  workflowRelayQuery$data
> = {
  "conditional-steps-first": {
    workflow: conditionalStepsFirst as workflowRelayQuery$data["workflow"],
  },
  "conditional-steps-second": {
    workflow: conditionalStepsSecond as workflowRelayQuery$data["workflow"],
  },
  "conditional-steps-third": {
    workflow: conditionalStepsThird as workflowRelayQuery$data["workflow"],
  },
  "mount-tmpdir-first": {
    workflow: mountTmpdirFirst as workflowRelayQuery$data["workflow"],
  },
  "notebook-first": {
    workflow: notebookFirst as workflowRelayQuery$data["workflow"],
  },
  "notebooks-second": {
    workflow: notebooksSecond as workflowRelayQuery$data["workflow"],
  },
  "ptycho-tomo-job-first": {
    workflow: ptychoTomoJobFirst as workflowRelayQuery$data["workflow"],
  },
  "ptycho-tomo-job-second": {
    workflow: ptychoTomoJobSecond as workflowRelayQuery$data["workflow"],
  },
  "ptycho-tomo-job-third": {
    workflow: ptychoTomoJobThird as workflowRelayQuery$data["workflow"],
  },
  "sin-simulate-artifact-first": {
    workflow: sinSimulateArtifactFirst as workflowRelayQuery$data["workflow"],
  },
};

export const defaultWorkflowResponse: workflowRelayQuery$data = {
  workflow: conditionalStepsThird as workflowRelayQuery$data["workflow"],
};
