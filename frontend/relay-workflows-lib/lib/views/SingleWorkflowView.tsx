import { Visit } from "workflows-lib";
import LiveSingleWorkflowView from "./LiveSingleWorkflowView";
import { useLazyLoadQuery } from "react-relay";
import { SingleWorkflowViewQuery as SingleWorkflowViewQueryType } from "./__generated__/SingleWorkflowViewQuery.graphql";
import { finishedStatuses } from "../utils/coreUtils";
import BaseSingleWorkflowView from "./BaseSingleWorkflowView";
import { graphql } from "react-relay";
import { useState } from "react";

export const SingleWorkflowViewQuery = graphql`
  query SingleWorkflowViewQuery($visit: VisitInput!, $name: String!) {
    workflow(visit: $visit, name: $name) {
      status {
        __typename
      }
      ...BaseSingleWorkflowViewFragment
    }
  }
`;

export interface SingleWorkflowViewProps {
  visit: Visit;
  workflowName: string;
  taskIds?: string[];
  onNullSubscriptionData?: () => void;
}

export default function SingleWorkflowView(props: SingleWorkflowViewProps) {
  const queryData = useLazyLoadQuery<SingleWorkflowViewQueryType>(
    SingleWorkflowViewQuery,
    {
      visit: props.visit,
      name: props.workflowName,
    },
  );

  const [isNull, setIsNull] = useState<boolean>(false);

  const onNullSubscriptionData = () => {
    setIsNull(true);
  };

  const workflow = queryData.workflow;

  const finished =
    workflow?.status != null &&
    finishedStatuses.has(workflow.status.__typename);

  return workflow && (finished || isNull) ? (
    <BaseSingleWorkflowView fragmentRef={workflow} taskIds={props.taskIds} />
  ) : (
    <LiveSingleWorkflowView
      {...props}
      onNullSubscriptionData={onNullSubscriptionData}
    />
  );
}
