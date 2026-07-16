import { Box, Paper, Typography, useTheme, Tooltip } from "@mui/material";
import React from "react";
import { Handle, Position } from "@xyflow/react";
import { getTaskStatusIcon } from "../common/StatusIcons";
import { Artifact, TaskStatus } from "../../types";
import { Visit } from "@diamondlightsource/sci-react-ui";

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

console.log("TASK FLOW NODE RENDER");

interface TaskFlowNodeProps {
  data: TaskFlowNodeData;
  onNavigate: (id: string, label?: string, e?: React.MouseEvent) => void;
  onSelectTask?: (taskId: string, label?: string) => void;
}

const TaskFlowNode: React.FC<TaskFlowNodeProps> = ({
  data,
  onNavigate,
  onSelectTask,
}) => {
  const theme = useTheme();

  const handleOpenTaskPage = (e: React.MouseEvent) => {
    console.log("NODE CLICK", data.taskId);

    onSelectTask?.(data.taskId, data.label);
    onNavigate(data.taskId, data.label, e);
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
        border: data.highlighted ? "1px solid #ff9c1a" : "1px solid #ccc",
        boxShadow: data.highlighted ? "0 0 10px #ff9c1a" : theme.shadows[3],
        transition: "all 0.3s ease-in-out",
        backgroundColor: data.filled ? "rgba(62, 218, 0, 1)" : undefined,
        cursor: "pointer",
      }}
    >
      <Handle type="target" position={Position.Left} />

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Tooltip title={data.label}>
          <Typography
            noWrap
            onClick={handleOpenTaskPage}
            sx={{ fontWeight: 500 }}
          >
            {data.label}
          </Typography>
        </Tooltip>

        {getTaskStatusIcon(data.status)}
      </Box>

      <Handle type="source" position={Position.Right} />
    </Paper>
  );
};

export default TaskFlowNode;
