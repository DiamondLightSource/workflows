import { Visit } from "workflows-lib";
import LiveSingleWorkflowView from "./LiveSingleWorkflowView";
import { useLazyLoadQuery } from "react-relay";
import { workflowRelayQuery } from "../graphql/workflowRelayQuery";
import { workflowRelayQuery as WorkflowRelayQueryType } from "../graphql/__generated__/workflowRelayQuery.graphql";
import { isFinished } from "../utils";
import BaseSingleWorkflowView from "./BaseSingleWorkflowView";

export interface SingleWorkflowViewProps {
  visit: Visit;
  workflowName: string;
  tasknames?: string[];
}

export default function SingleWorkflowView(props: SingleWorkflowViewProps) {
  const queryData = useLazyLoadQuery<WorkflowRelayQueryType>(
    workflowRelayQuery,
    {
      visit: props.visit,
      name: props.workflowName,
    },
  );

  const finished = isFinished(queryData);

  return finished ? (
    <BaseSingleWorkflowView data={queryData} tasknames={props.tasknames} />
  ) : (
    <LiveSingleWorkflowView {...props} />
  );
}
