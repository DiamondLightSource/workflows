import React, { useState, useEffect } from "react";
import Tooltip from "@mui/material/Tooltip";
import Cancel from "@mui/icons-material/Cancel";
import { graphql } from "relay-runtime";
import { useMutation } from "react-relay";
import { IconButton, Box } from "@mui/material";
import { StopWorkflowMutation as StopWorkflowMutationType } from "./__generated__/StopWorkflowMutation.graphql";

const stopWorkflowMutation = graphql`
  mutation StopWorkflowMutation($id: ID!) {
    stopWorkflow(id: $id) {
      id
    }
  }
`;

interface StopWorkflowProps {
  workflowId: string;
}

const StopWorkflow: React.FC<StopWorkflowProps> = ({ workflowId }) => {
  const [loading, setLoading] = useState(false);
  const buttonCooldown = 5000;
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setLoading(false);
      }, buttonCooldown);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [loading]);
  const [errorMessage, setErrorMessage] = useState("");

  const [commitMutation] =
    useMutation<StopWorkflowMutationType>(stopWorkflowMutation);

  const stopWorkflow = () => {
    setLoading(true);
    commitMutation({
      variables: { id: workflowId },
      onCompleted: () => {
        // Puts button on a cooldown so its not spammed
        setErrorMessage("");
      },
      onError: (err) => {
        setLoading(false);
        setErrorMessage(err.message);
      },
    });
  };

  return (
    <Box sx={{ ml: "auto" }} display="flex" justifyContent="flex-end">
      <Tooltip title={errorMessage === "" ? "Stop workflow" : errorMessage}>
        <IconButton
          onClick={() => {
            stopWorkflow();
          }}
          color={errorMessage === "" ? "default" : "error"}
          loading={loading}
        >
          <Cancel />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default StopWorkflow;
