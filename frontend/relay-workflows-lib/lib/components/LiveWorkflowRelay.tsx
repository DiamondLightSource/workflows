import { useEffect, useRef, useState } from "react";
import { requestSubscription, useRelayEnvironment } from "react-relay";
import { workflowRelaySubscription } from "../graphql/workflowRelaySubscription";
import {
  workflowRelaySubscription$data,
  workflowRelaySubscription as WorkflowRelaySubscriptionType,
} from "../graphql/__generated__/workflowRelaySubscription.graphql";
import BaseWorkflowRelay from "./BaseWorkflowRelay";
import { WorkflowRelayProps } from "./WorkflowRelay";
import { isFinished } from "../utils";

interface LiveWorkflowRelayProps extends WorkflowRelayProps {
  onNull: () => void;
}

export default function LiveWorkflowRelay(props: LiveWorkflowRelayProps) {
  const [workflowData, setWorkflowData] =
    useState<workflowRelaySubscription$data | null>(null);

  const subscriptionRef = useRef<{ dispose: () => void } | null>(null);
  const environment = useRelayEnvironment();
  useEffect(() => {
    const subscription = requestSubscription<WorkflowRelaySubscriptionType>(
      environment,
      {
        subscription: workflowRelaySubscription,
        variables: {
          visit: props.data.workflow.visit,
          name: props.data.workflow.name,
        },
        onNext: (response?: workflowRelaySubscription$data | null) => {
          if (response) {
            setWorkflowData(response);

            if (isFinished(response)) {
              console.log("Workflow finished, unsubscribing.");
              subscriptionRef.current?.dispose();
            }
          } else {
            props.onNull();
          }
        },
        onError: (error: unknown) => {
          console.error("Subscription error:", error);
        },
        onCompleted: () => {
          console.log("completed");
        },
      },
    );

    subscriptionRef.current = subscription;

    return () => {
      subscriptionRef.current?.dispose();
    };
  }, [
    props.data.workflow.visit,
    props.data.workflow.name,
    props.onNull,
    environment,
  ]);

  return workflowData ? (
    <BaseWorkflowRelay {...props} data={workflowData} />
  ) : null;
}
