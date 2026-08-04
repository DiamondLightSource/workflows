import LiveSingleWorkflowView from "./LiveSingleWorkflowView";
import { useLazyLoadQuery } from "react-relay";
import { SingleWorkflowViewQuery as SingleWorkflowViewQueryType } from "./__generated__/SingleWorkflowViewQuery.graphql";
import { finishedStatuses } from "../utils/coreUtils";
import BaseSingleWorkflowView from "./BaseSingleWorkflowView";
import { graphql } from "react-relay";
import { useState } from "react";

export const SingleWorkflowViewQuery = graphql`
  query SingleWorkflowViewQuery($id: ID!) {
    workflowById(id: $id) {
      status {
        __typename
      }
      ...BaseSingleWorkflowViewFragment
    }
  }
`;

export interface SingleWorkflowViewProps {
  workflowId: string;
  taskIds?: string[];
  onNullSubscriptionData?: () => void;
  onSelectTask?: (taskId: string) => void;
}

export default function SingleWorkflowView(props: SingleWorkflowViewProps) {
  const queryData = useLazyLoadQuery<SingleWorkflowViewQueryType>(
    SingleWorkflowViewQuery,
    {
      id: props.workflowId,
      visit: props.visit,
      name: props.workflowName,
      
      


    },
  );
  const finished =
    queryData.workflowById?.status?.__typename &&
    finishedStatuses.has(queryData.workflowById.status.__typename);
  const [isNull, setIsNull] = useState<boolean>(false);
  const onNullSubscriptionData = () => {
    setIsNull(true);
  };

  return finished || isNull ? (
      <BaseSingleWorkflowView
        fragmentRef={queryData.workflow ?? null}
        taskIds={props.taskIds}
        onSelectTask={props.onSelectTask}
      />
    ) : (
    <LiveSingleWorkflowView
      {...props}
      onNullSubscriptionData={onNullSubscriptionData}
    />
  );
}
