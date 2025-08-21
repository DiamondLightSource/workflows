import { useMemo, useState } from "react";
import { useSubscription } from "react-relay";
import { workflowRelaySubscription } from "../graphql/workflowRelaySubscription";
import {
  workflowRelaySubscription$data,
  workflowRelaySubscription as WorkflowRelaySubscriptionType,
} from "../graphql/__generated__/workflowRelaySubscription.graphql";
import BaseWorkflowRelay from "./BaseWorkflowRelay";
import { WorkflowRelayProps } from "./WorkflowRelay";

export default function LiveWorkflowRelay(props: WorkflowRelayProps) {
  const [workflowData, setWorkflowData] =
    useState<workflowRelaySubscription$data | null>(null);

  const subscriptionConfig = useMemo(
    () => ({
      subscription: workflowRelaySubscription,
      variables: {
        visit: props.visit,
        name: props.workflowName,
      },
      onNext: (response?: workflowRelaySubscription$data | null) => {
        if (response) {
          setWorkflowData(response);
        }
      },
      onError: (error: unknown) => {
        console.error("Subscription error:", error);
      },
      onCompleted: () => {
        console.log("completed");
      },
    }),
    [props.visit, props.workflowName],
  );

  useSubscription<WorkflowRelaySubscriptionType>(subscriptionConfig);

  return <BaseWorkflowRelay {...props} data={workflowData} />;
}
