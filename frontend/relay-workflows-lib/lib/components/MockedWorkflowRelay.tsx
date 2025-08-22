import { useLazyLoadQuery } from "react-relay";
import { workflowRelayQuery } from "../graphql/workflowRelayQuery";
import { workflowRelayQuery as WorkflowRelayQueryType } from "../graphql/__generated__/workflowRelayQuery.graphql";
import BaseWorkflowRelay from "./BaseWorkflowRelay";
import { WorkflowRelayProps } from "./WorkflowRelay";

export default function MockedWorkflowRelay(props: WorkflowRelayProps) {
  const queryData = useLazyLoadQuery<WorkflowRelayQueryType>(
    workflowRelayQuery,
    {
      visit: props.visit,
      name: props.workflowName,
    },
  );

  return <BaseWorkflowRelay {...props} data={queryData} />;
}
