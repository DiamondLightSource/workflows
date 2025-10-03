import { useEffect, useRef, useState } from "react";
import { requestSubscription, useRelayEnvironment } from "react-relay";
import BaseWorkflowRelay from "../components/BaseWorkflowRelay";
import { WorkflowRelayProps } from "../components/WorkflowRelay";
import { isFinished } from "../utils/coreUtils";
import { graphql } from "react-relay";
import { BaseWorkflowRelayFragment$key } from "../components/__generated__/BaseWorkflowRelayFragment.graphql";
import { Visit } from "workflows-lib";
import {
  LiveWorkflowRelaySubscription$data,
  LiveWorkflowRelaySubscription as LiveWorkflowRelaySubscriptionType,
} from "./__generated__/LiveWorkflowRelaySubscription.graphql";

export const LiveWorkflowRelaySubscription = graphql`
  subscription LiveWorkflowRelaySubscription(
    $visit: VisitInput!
    $name: String!
  ) {
    workflow(visit: $visit, name: $name) {
      status {
        __typename
      }
      ...BaseWorkflowRelayFragment
    }
  }
`;

interface LiveWorkflowRelayProps extends WorkflowRelayProps {
  onNullSubscriptionData: () => void;
  baseFragmentRef: BaseWorkflowRelayFragment$key;
  workflowName: string;
  visit: Visit;
}

export default function LiveWorkflowRelay(props: LiveWorkflowRelayProps) {
  const [workflowFragmentRef, setWorkflowFragmentRef] =
    useState<BaseWorkflowRelayFragment$key | null>(null);

  const environment = useRelayEnvironment();
  const subscriptionRef = useRef<{ dispose: () => void } | null>(null);

  useEffect(() => {
    const subscription = requestSubscription<LiveWorkflowRelaySubscriptionType>(
      environment,
      {
        subscription: LiveWorkflowRelaySubscription,
        variables: {
          visit: props.visit,
          name: props.workflowName,
        },
        onNext: (response?: LiveWorkflowRelaySubscription$data | null) => {
          if (response?.workflow) {
            setWorkflowFragmentRef(
              response.workflow as unknown as BaseWorkflowRelayFragment$key,
            );

            if (isFinished(response)) {
              console.log("Workflow finished, unsubscribing.");
              subscriptionRef.current?.dispose();
            }
          } else {
            props.onNullSubscriptionData();
            setWorkflowFragmentRef(null);
          }
        },
        onError: (error: unknown) => {
          console.error("Subscription error:", error);
        },
        onCompleted: () => {
          console.log("Subscription completed");
        },
      },
    );

    subscriptionRef.current = subscription;

    return () => {
      subscriptionRef.current?.dispose();
    };
  }, [props, environment]);

  return workflowFragmentRef ? (
    <BaseWorkflowRelay {...props} fragmentRef={workflowFragmentRef} />
  ) : null;
}
