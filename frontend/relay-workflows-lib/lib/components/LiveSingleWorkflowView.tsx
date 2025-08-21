import { useState, useMemo } from "react";
import { useSubscription } from "react-relay";
import { GraphQLSubscriptionConfig } from "relay-runtime";
import {
  workflowRelaySubscription$data,
  workflowRelaySubscription as WorkflowRelaySubscriptionType,
} from "../graphql/__generated__/workflowRelaySubscription.graphql";
import { workflowRelaySubscription } from "../graphql/workflowRelaySubscription";
import BaseSingleWorkflowView from "./BaseSingleWorkflowView";
import { SingleWorkflowViewProps } from "./SingleWorkflowView";

export default function LiveWorkflowView({
  visit,
  workflowName,
  tasknames,
}: SingleWorkflowViewProps) {
  const [workflowData, setWorkflowData] =
    useState<workflowRelaySubscription$data | null>(null);

  const subscriptionData: GraphQLSubscriptionConfig<WorkflowRelaySubscriptionType> =
    useMemo(
      () => ({
        subscription: workflowRelaySubscription,
        variables: { visit, name: workflowName },
        onNext: (res) => {
          setWorkflowData(res ?? null);
        },
        onError: (error: unknown) => {
          console.error("Subscription error:", error);
        },
        onCompleted: () => {
          console.log("completed");
        },
      }),
      [visit, workflowName],
    );

  useSubscription(subscriptionData);

  return (
    <BaseSingleWorkflowView
      visit={visit}
      workflowName={workflowName}
      tasknames={tasknames}
      data={workflowData}
    />
  );
}
