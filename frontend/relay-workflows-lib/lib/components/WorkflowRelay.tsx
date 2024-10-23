import { useFragment } from "react-relay";
import { graphql } from "react-relay";
import { WorkflowAccordion } from "workflows-lib";
import type { WorkflowStatus } from "workflows-lib";
import { WorkflowRelayFragment$key } from "./__generated__/WorkflowRelayFragment.graphql";

const WorkflowRelay = (props: {
  workflow: WorkflowRelayFragment$key;
  children: React.ReactNode;
}) => {
  const workflowFragment = graphql`
    fragment WorkflowRelayFragment on Workflow {
      name
      status {
        __typename
      }
    }
  `;
  const data = useFragment(workflowFragment, props.workflow);
  const statusTextMap: { [key: string]: WorkflowStatus } = {
    WorkflowPendingStatus: "Pending",
    WorkflowRunningStatus: "Running",
    WorkflowSucceededStatus: "Succeeded",
    WorkflowFailedStatus: "Failed",
    WorkflowErroredStatus: "Errored",
  };
  const statusText = data.status
    ? statusTextMap[data.status.__typename]
    : "Unknown";
  return (
    <WorkflowAccordion
      workflow={{
        name: data.name,
        status: statusText,
      }}
    >
      children
    </WorkflowAccordion>
  );
};

export default WorkflowRelay;
