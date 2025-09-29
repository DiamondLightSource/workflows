import React, { useMemo, useState } from "react";
import { useSubscription } from "react-relay";
import { GraphQLSubscriptionConfig } from "relay-runtime";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Divider,
  Paper,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Link } from "react-router-dom";
import {
  SubmissionData,
  SubmissionGraphQLErrorMessage,
  SubmissionNetworkErrorMessage,
  SubmissionSuccessMessage,
  WorkflowStatus,
} from "workflows-lib/lib/types";
import {
  workflowRelaySubscription$data,
  workflowRelaySubscription as WorkflowRelaySubscriptionType,
} from "../graphql/__generated__/workflowRelaySubscription.graphql";
import { workflowRelaySubscription } from "../graphql/workflowRelaySubscription";
import { getWorkflowStatusIcon } from "workflows-lib/lib/components/common/StatusIcons";
import { Visit } from "@diamondlightsource/sci-react-ui";

interface RenderSubmittedMessagePropsList {
  result:
    | SubmissionGraphQLErrorMessage
    | SubmissionNetworkErrorMessage
    | SubmissionSuccessMessage;
  index: number;
  workflowData: workflowRelaySubscription$data | null;
}

const RenderSubmittedMessage: React.FC<RenderSubmittedMessagePropsList> = ({
  result,
  index,
  workflowData,
}) => {
  switch (result.type) {
    case "success":
      return (
        <Accordion
          key={`success-${String(index)}`}
          disableGutters
          onChange={() => {}}
        >
          <AccordionSummary>
            <Typography sx={{ width: "100%", lineHeight: "25px" }}>
              Successfully submitted{" "}
              <Link to={`/workflows/${result.message}`}>{result.message}</Link>
            </Typography>
            {workflowData
              ? getWorkflowStatusIcon(
                  workflowData.workflow.status?.__typename as WorkflowStatus,
                )
              : getWorkflowStatusIcon("Unknown")}
          </AccordionSummary>
        </Accordion>
      );

    case "networkError":
      return (
        <Accordion key={`error-msg-${String(index)}`}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              sx={{ width: "100%", lineHeight: "25px", color: "red" }}
            >
              Submission error type {result.error.name}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>
              Submission error message {result.error.message}
            </Typography>
          </AccordionDetails>
        </Accordion>
      );
    case "graphQLError":
    default:
      return (
        <Accordion key={`errors-${String(index)}`}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography
              sx={{ width: "100%", lineHeight: "25px", color: "red" }}
            >
              Submission error type GraphQL
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {result.errors.map((e, j) => {
              return (
                <Typography key={`errors-msgs-${String(j)}`}>
                  Error {j} {e.message}
                </Typography>
              );
            })}
          </AccordionDetails>
        </Accordion>
      );
  }
};

interface SubscribeAndRenderPropsList {
  result:
    | SubmissionGraphQLErrorMessage
    | SubmissionNetworkErrorMessage
    | SubmissionSuccessMessage;
  visit: Visit;
  workflowName: string;
  index: number;
}

const SubscribeAndRender: React.FC<SubscribeAndRenderPropsList> = ({
  result,
  visit,
  workflowName,
  index,
}) => {
  const [workflowData, setWorkflowData] =
    useState<workflowRelaySubscription$data | null>(null);

  const subscriptionData: GraphQLSubscriptionConfig<WorkflowRelaySubscriptionType> =
    useMemo(
      () => ({
        subscription: workflowRelaySubscription,
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
      workflowData={workflowData}
    />
  );
};

interface SubmittedMessagesListProps {
  submittedData: SubmissionData[];
}

const SubmittedMessagesList: React.FC<SubmittedMessagesListProps> = ({
  submittedData,
}) => {
  return (
    <Box
      sx={{
        width: {
          xl: "100%",
          lg: "100%",
          md: "90%",
          sm: "80%",
          xs: "70%",
        },
        maxWidth: "1200px",
        height: "100%",
        mx: "auto",
      }}
    >
      <Divider sx={{ mt: 5, mb: 5 }} />
      {submittedData.length > 0 && (
        <>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ textAlign: "center" }}>
              Submissions
            </Typography>
          </Paper>
          {submittedData.map((data, index) =>
            data.workflowName ? (
              <SubscribeAndRender
                key={`subscribe-and-render-${String(index)}`}
                result={data.submissionResult}
                visit={data.visit}
                workflowName={data.workflowName}
                index={index}
              />
            ) : (
              <RenderSubmittedMessage
                result={data.submissionResult}
                index={index}
                workflowData={null}
              />
            ),
          )}
        </>
      )}
    </Box>
  );
};

export default SubmittedMessagesList;
