import React from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Link } from "react-router-dom";
import {
  SubmissionGraphQLErrorMessage,
  SubmissionNetworkErrorMessage,
  SubmissionSuccessMessage,
  WorkflowStatus,
} from "workflows-lib/lib/types";
import { getWorkflowStatusIcon } from "workflows-lib/lib/components/common/StatusIcons";
import { graphql } from "relay-runtime";
import { useFragment } from "react-relay";
import { RenderSubmittedMessageFragment$key } from "./__generated__/RenderSubmittedMessageFragment.graphql";

const RenderSubmittedMessageFragment = graphql`
  fragment RenderSubmittedMessageFragment on Workflow {
    status {
      __typename
    }
  }
`;

interface RenderSubmittedMessagePropsList {
  result:
    | SubmissionGraphQLErrorMessage
    | SubmissionNetworkErrorMessage
    | SubmissionSuccessMessage;
  index: number;
  fragmentRef?: RenderSubmittedMessageFragment$key | null;
}

export const RenderSubmittedMessage: React.FC<
  RenderSubmittedMessagePropsList
> = ({ result, index, fragmentRef }) => {
  const data = useFragment(RenderSubmittedMessageFragment, fragmentRef);
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
            {data
              ? getWorkflowStatusIcon(data.status?.__typename as WorkflowStatus)
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
