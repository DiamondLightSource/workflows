import React, { useState } from "react";
import LiveWorkflowRelay from "./LiveWorkflowRelay";
import { workflowRelayQuery$data } from "../graphql/__generated__/workflowRelayQuery.graphql";
import BaseWorkflowRelay from "./BaseWorkflowRelay";
import { isFinished } from "../utils";
export interface WorkflowRelayProps {
  data: workflowRelayQuery$data;
  workflowLink?: boolean;
  filledTaskId?: string | null;
  expanded?: boolean;
  onChange?: () => void;
}

const WorkflowRelay: React.FC<WorkflowRelayProps> = (props) => {
  const finished = isFinished(props.data);
  const [isNull, setIsNull] = useState<boolean>(false);
  const onNull = () => {
    setIsNull(true);
  };

  return finished || isNull ? (
    <BaseWorkflowRelay {...props} data={props.data} />
  ) : (
    <LiveWorkflowRelay {...props} onNull={onNull} />
  );
};

export default WorkflowRelay;
