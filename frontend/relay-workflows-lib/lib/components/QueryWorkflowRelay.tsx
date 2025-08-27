import React from "react";
import { Visit } from "workflows-lib";
import { workflowRelayQuery } from "../graphql/workflowRelayQuery";
import { workflowRelayQuery as WorkflowRelayQueryType } from "../graphql/__generated__/workflowRelayQuery.graphql";
import { useLazyLoadQuery } from "react-relay";
import WorkflowRelay from "./WorkflowRelay";

export interface WorkflowRelayProps {
  visit: Visit;
  workflowName: string;
  workflowLink?: boolean;
  filledTaskName?: string | null;
  expanded?: boolean;
  onChange?: () => void;
}

const QueryWorkflowRelay: React.FC<WorkflowRelayProps> = (props) => {
  const queryData = useLazyLoadQuery<WorkflowRelayQueryType>(
    workflowRelayQuery,
    {
      visit: props.visit,
      name: props.workflowName,
    },
  );

  return <WorkflowRelay {...props} data={queryData} />;
};

export default QueryWorkflowRelay;
