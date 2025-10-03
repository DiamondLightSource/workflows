import React, { useState } from "react";
import LiveWorkflowRelay from "../subscription-components/LiveWorkflowRelay";
import BaseWorkflowRelay from "./BaseWorkflowRelay";
import { finishedStatuses } from "../utils/coreUtils";
import { graphql } from "relay-runtime";
import { useFragment } from "react-relay";
import { WorkflowRelayFragment$key } from "./__generated__/WorkflowRelayFragment.graphql";

export const WorkflowRelayFragment = graphql`
  fragment WorkflowRelayFragment on Workflow {
    ...BaseWorkflowRelayFragment
    status {
      __typename
    }
    visit {
      proposalCode
      proposalNumber
      number
    }
    name
  }
`;

export interface WorkflowRelayProps {
  fragmentRef: WorkflowRelayFragment$key;
  workflowLink?: boolean;
  filledTaskId?: string | null;
  expanded?: boolean;
  onChange?: () => void;
}

const WorkflowRelay: React.FC<WorkflowRelayProps> = (props) => {
  const data = useFragment(WorkflowRelayFragment, props.fragmentRef);
  const finished =
    data.status?.__typename && finishedStatuses.has(data.status.__typename);
  const [isNull, setIsNull] = useState<boolean>(false);
  const onNullSubscriptionData = () => {
    setIsNull(true);
  };

  return finished || isNull ? (
    <BaseWorkflowRelay {...props} fragmentRef={data} />
  ) : (
    <LiveWorkflowRelay
      {...props}
      workflowName={data.name}
      visit={data.visit}
      baseFragmentRef={data}
      onNullSubscriptionData={onNullSubscriptionData}
    />
  );
};

export default WorkflowRelay;
