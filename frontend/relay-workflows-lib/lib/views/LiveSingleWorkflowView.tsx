import { useEffect, useRef, useState } from "react";
import { requestSubscription, useRelayEnvironment } from "react-relay";
import { graphql } from "react-relay";
import {
  LiveSingleWorkflowViewSubscription,
  LiveSingleWorkflowViewSubscription$data,
} from "./__generated__/LiveSingleWorkflowViewSubscription.graphql";
import BaseSingleWorkflowView from "./BaseSingleWorkflowView";
import { BaseSingleWorkflowViewFragment$key } from "./__generated__/BaseSingleWorkflowViewFragment.graphql";
import { SingleWorkflowViewProps } from "./SingleWorkflowView";
import { isFinished } from "../utils/coreUtils";

const LiveSingleWorkflowViewSubscriptionQuery = graphql`
  subscription LiveSingleWorkflowViewSubscription(
    $visit: VisitInput!
    $name: String!
  ) {
    workflow(visit: $visit, name: $name) {
      status {
        __typename
      }
      ...BaseSingleWorkflowViewFragment
    }
  }
`;

interface LiveWorkflowRelayProps extends SingleWorkflowViewProps {
  onNullSubscriptionData: () => void;
}

export default function LiveWorkflowView({
  visit,
  workflowName,
  taskIds,
  onNullSubscriptionData,
}: LiveWorkflowRelayProps) {
  const [workflowFragmentRef, setWorkflowFragmentRef] =
    useState<BaseSingleWorkflowViewFragment$key | null>(null);
  const environment = useRelayEnvironment();
  const subscriptionRef = useRef<{ dispose: () => void } | null>(null);

  useEffect(() => {
    const subscription =
      requestSubscription<LiveSingleWorkflowViewSubscription>(environment, {
        subscription: LiveSingleWorkflowViewSubscriptionQuery,
        variables: { visit, name: workflowName },
        onNext: (response?: LiveSingleWorkflowViewSubscription$data | null) => {
          if (response?.workflow) {
            setWorkflowFragmentRef(response.workflow);
            if (isFinished(response)) {
              console.log("Workflow finished, unsubscribing.");
              subscriptionRef.current?.dispose();
            }
          } else {
            onNullSubscriptionData();
            setWorkflowFragmentRef(null);
          }
        },
        onError: (error: unknown) => {
          console.error("Subscription error:", error);
        },
        onCompleted: () => {
          console.log("Subscription completed");
        },
      });

    subscriptionRef.current = subscription;

    return () => {
      subscriptionRef.current?.dispose();
    };
  }, [visit, workflowName, environment, onNullSubscriptionData]);

  return workflowFragmentRef ? (
    <BaseSingleWorkflowView
      taskIds={taskIds}
      fragmentRef={workflowFragmentRef}
    />
  ) : null;
}
