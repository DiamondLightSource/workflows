import React, { useMemo, useState } from "react";
import { useSubscription } from "react-relay";
import { GraphQLSubscriptionConfig } from "relay-runtime";
import {
  SubmissionGraphQLErrorMessage,
  SubmissionNetworkErrorMessage,
  SubmissionSuccessMessage,
} from "workflows-lib/lib/types";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { RenderSubmittedMessage } from "./RenderSubmittedMessage";
import { graphql, GraphQLTaggedNode } from "react-relay";
import {
  SubscribeAndRenderSubscription$data,
  SubscribeAndRenderSubscription as SubscribeAndRenderSubscriptionType,
} from "./__generated__/SubscribeAndRenderSubscription.graphql";

export const SubscribeAndRenderSubscription: GraphQLTaggedNode = graphql`
  subscription SubscribeAndRenderSubscription(
    $visit: VisitInput!
    $name: String!
  ) {
    workflow(visit: $visit, name: $name) {
      ...RenderSubmittedMessageFragment
    }
  }
`;

interface SubscribeAndRenderPropsList {
  result:
    | SubmissionGraphQLErrorMessage
    | SubmissionNetworkErrorMessage
    | SubmissionSuccessMessage;
  visit: Visit;
  workflowName: string;
  index: number;
}

export const SubscribeAndRender: React.FC<SubscribeAndRenderPropsList> = ({
  result,
  visit,
  workflowName,
  index,
}) => {
  const [workflowData, setWorkflowData] =
    useState<SubscribeAndRenderSubscription$data | null>(null);

  const subscriptionData: GraphQLSubscriptionConfig<SubscribeAndRenderSubscriptionType> =
    useMemo(
      () => ({
        subscription: SubscribeAndRenderSubscription,
        variables: { visit, name: workflowName },
        onNext: (response) => {
          setWorkflowData(response ?? null);
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
    <RenderSubmittedMessage
      result={result}
      index={index}
      fragmentRef={workflowData?.workflow ?? null}
    />
  );
};
