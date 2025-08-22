import React from "react";
import MockedWorkflowRelay from "./MockedWorkflowRelay";
import LiveWorkflowRelay from "./LiveWorkflowRelay";
import { Visit } from "workflows-lib";
export interface WorkflowRelayProps {
  visit: Visit;
  workflowName: string;
  workflowLink?: boolean;
  filledTaskName?: string | null;
  expanded?: boolean;
  onChange?: () => void;
}

const isMocking = import.meta.env.VITE_ENABLE_MOCKING === "true";

const WorkflowRelay: React.FC<WorkflowRelayProps> = (props) => {
  return isMocking ? (
    <MockedWorkflowRelay {...props} />
  ) : (
    <LiveWorkflowRelay {...props} />
  );
};

export default WorkflowRelay;
