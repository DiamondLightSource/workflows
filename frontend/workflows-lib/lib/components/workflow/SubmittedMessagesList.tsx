import React from "react";
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
  SubmissionGraphQLErrorMessage,
  SubmissionNetworkErrorMessage,
  SubmissionSuccessMessage,
} from "../../types";

const renderSubmittedMessage = (
  r:
    | SubmissionGraphQLErrorMessage
    | SubmissionNetworkErrorMessage
    | SubmissionSuccessMessage,
  i: number,
) => {
  switch (r.type) {
    case "success":
      return (
        <Accordion
          key={`success-${String(i)}`}
          disableGutters
          onChange={() => {}}
        >
          <AccordionSummary>
            <Typography>
              Successfully submitted{" "}
              <Link to={`/workflows/${r.message}`}>{r.message}</Link>
            </Typography>
          </AccordionSummary>
        </Accordion>
      );

    case "networkError":
      return (
        <Accordion key={`error-msg-${String(i)}`}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ color: "red" }}>
              Submission error type {r.error.name}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography>Submission error message {r.error.message}</Typography>
          </AccordionDetails>
        </Accordion>
      );
    case "graphQLError":
    default:
      return (
        <Accordion key={`errors-${String(i)}`}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography sx={{ color: "red" }}>
              Submission error type GraphQL
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            {r.errors.map((e, j) => {
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

interface SubmittedMessagesListProps {
  submissionResults: (
    | SubmissionGraphQLErrorMessage
    | SubmissionNetworkErrorMessage
    | SubmissionSuccessMessage
  )[];
}

const SubmittedMessagesList: React.FC<SubmittedMessagesListProps> = ({
  submissionResults,
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
      {submissionResults.length > 0 && (
        <>
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ textAlign: "center" }}>
              Submissions
            </Typography>
          </Paper>
          {submissionResults.map((r, i) => renderSubmittedMessage(r, i))}
        </>
      )}
    </Box>
  );
};

export default SubmittedMessagesList;
