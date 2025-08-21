import { Visit } from "workflows-lib";
import LiveSingleWorkflowView from "./LiveSingleWorkflowView";
import MockedWorkflowView from "./MockedSingleWorkflowView";

const isMocking = import.meta.env.VITE_ENABLE_MOCKING === "true";
export interface SingleWorkflowViewProps {
  visit: Visit;
  workflowName: string;
  tasknames?: string[];
}

export default function SingleWorkflowView(props: SingleWorkflowViewProps) {
  return isMocking ? (
    <MockedWorkflowView {...props} />
  ) : (
    <LiveSingleWorkflowView {...props} />
  );
}
