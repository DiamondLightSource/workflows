import { Box, Paper, Typography, useTheme } from "@mui/material";
import React from "react";
import { Handle, Position } from "@xyflow/react";
import { getTaskStatusIcon } from "../common/StatusIcons";
import { Artifact, TaskStatus } from "../../types";
import { Tooltip } from "@mui/material";
import { Visit } from "../../types";
import { useNavigate } from "react-router-dom";

const visitToText = (visit?: Visit): string => {
  return visit
    ? `${visit.proposalCode}${visit.proposalNumber.toFixed(
        0
      )}-${visit.number.toFixed(0)}`
    : "";
};

interface TaskFlowNodeProps {
  data: {
    label: string;
    status: TaskStatus;
    details: Artifact[];
    workflow: string;
    instrumentSession: Visit;
  };
}

const TaskFlowNode: React.FC<TaskFlowNodeProps> = ({ data }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const handleOpenTaskPage = () => {
    const instrumentSessionId = visitToText(data.instrumentSession);
    navigate(`/workflows/${instrumentSessionId}/${data.workflow}/${data.label}/`);
  };

  return (
    <Paper
      elevation={8}
      sx={{
        padding: theme.spacing(1.5),
        minWidth: 100,
        maxWidth: 140,
        width: "100%",
        height: "100%",
        maxHeight: 100,
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: theme.palette.grey[700] }}
      />
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        minWidth={100}
        maxWidth={140}
        height="100%"
        width="100%"
        maxHeight={60}
      >
        <Tooltip title={data.label}>
          <Typography
            variant="subtitle1"
            noWrap
            sx={{
              fontWeight: 500,
              minWidth: 80,
              maxWidth: 160,
            }}
            onClick={handleOpenTaskPage}
          >
            {data.label}
          </Typography>
        </Tooltip>
        {getTaskStatusIcon(data.status)}
      </Box>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: theme.palette.grey[700] }}
      />
    </Paper>
  );
};

export default TaskFlowNode;
