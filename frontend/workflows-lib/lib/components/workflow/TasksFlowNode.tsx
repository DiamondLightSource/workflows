import { Box, Paper, Typography, useTheme, Tooltip } from "@mui/material";
import React, { useCallback } from "react";
import { Handle, Position } from "@xyflow/react";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { getTaskStatusIcon } from "../common/StatusIcons";
import { Artifact, TaskStatus } from "../../types";

export interface TaskFlowNodeData {
  label: string;
  taskId: string;
  status: TaskStatus;
  details: Artifact[];
  workflow: string;
  instrumentSession: Visit;
  highlighted: boolean;
  filled: boolean;
}

interface TaskFlowNodeProps {
  data: TaskFlowNodeData;
  onNavigate: (id: string, e?: React.MouseEvent) => void;
}

const TaskFlowNode: React.FC<TaskFlowNodeProps> = ({ data, onNavigate }) => {
  const theme = useTheme();

  const handleOpenTaskPage = useCallback(
    (event: React.MouseEvent) => {
      // Do not let React Flow interpret this click as a canvas interaction.
      event.preventDefault();
      event.stopPropagation();

      onNavigate(data.taskId, event);
    },
    [data.taskId, onNavigate],
  );

  return (
    <Paper
      elevation={8}
      onClick={handleOpenTaskPage}
      sx={{
        padding: theme.spacing(1.5),
        minWidth: 100,
        maxWidth: 140,
        width: "100%",
        height: "100%",
        maxHeight: 100,

        border: data.highlighted ? "1px solid #ff9c1a" : "1px solid #ccc",

        boxShadow: data.highlighted ? "0 0 10px #ff9c1a" : theme.shadows[3],

        transition: "border 0.15s ease-in-out, box-shadow 0.15s ease-in-out",

        backgroundColor: data.filled ? "rgba(62, 218, 0, 1)" : undefined,

        cursor: "pointer",

        // Make sure the node itself receives the pointer event.
        pointerEvents: "auto",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: theme.palette.grey[700],
        }}
        data-testid="handle-target"
        onClick={(event) => {
          event.stopPropagation();
        }}
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
        onClick={handleOpenTaskPage}
      >
        <Tooltip title={data.label}>
          <Typography
            component="h3"
            noWrap
            sx={{
              fontWeight: 500,
              minWidth: 80,
              maxWidth: 160,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            {data.label}
          </Typography>
        </Tooltip>

        {getTaskStatusIcon(data.status)}
      </Box>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: theme.palette.grey[700],
        }}
        data-testid="handle-source"
        onClick={(event) => {
          event.stopPropagation();
        }}
      />
    </Paper>
  );
};

export default TaskFlowNode;
