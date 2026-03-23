import React from "react";

import { Box, Divider, Paper, Typography } from "@mui/material";
import { SubmissionData } from "workflows-lib/lib/types";
import { RenderSubmittedMessage } from "relay-workflows-lib/lib/components/RenderSubmittedMessage";
import { SubscribeAndRender } from "relay-workflows-lib/lib/subscription-components/SubscribeAndRender";

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
              />
            ),
          )}
        </>
      )}
    </Box>
  );
};

export default SubmittedMessagesList;
