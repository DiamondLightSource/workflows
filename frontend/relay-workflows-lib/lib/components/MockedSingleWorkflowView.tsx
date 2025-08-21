import { useLazyLoadQuery } from "react-relay";
import { workflowRelayQuery } from "../graphql/workflowRelayQuery";
import BaseSingleWorkflowView from "./BaseSingleWorkflowView";
import { workflowRelayQuery as WorkflowRelayQueryType } from "../graphql/__generated__/workflowRelayQuery.graphql";
import { SingleWorkflowViewProps } from "./SingleWorkflowView";

export default function MockedWorkflowView({
  visit,
  workflowName,
  tasknames,
}: SingleWorkflowViewProps) {
  const queryData = useLazyLoadQuery<WorkflowRelayQueryType>(
    workflowRelayQuery,
    {
      visit,
      name: workflowName,
    },
  );

  return (
    <BaseSingleWorkflowView
      visit={visit}
      workflowName={workflowName}
      tasknames={tasknames}
      data={queryData}
    />
  );
}
