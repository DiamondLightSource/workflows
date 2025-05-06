import { Box, Paper, Typography, useTheme, Tooltip } from "@mui/material";
import React from "react";
import { Handle, Position } from "@xyflow/react";
import { getTaskStatusIcon } from "../common/StatusIcons";
import { Artifact, TaskStatus } from "../../types";
import { Visit } from "../../types";
import { visitToText } from "../common/utils";

export interface TaskFlowNodeData {
  label: string;
  status: TaskStatus;
  details: Artifact[];
  workflow: string;
  instrumentSession: Visit;
  highlighted: boolean
}

interface TaskFlowNodeProps {
  data: TaskFlowNodeData;
  onNavigate: (path: string) => void;
}

const TaskFlowNode: React.FC<TaskFlowNodeProps> = ({ data, onNavigate }) => {
  const theme = useTheme();
  const handleOpenTaskPage = () => {
    const instrumentSessionId = visitToText(data.instrumentSession);
    onNavigate(
      `/workflows/${instrumentSessionId}/${data.workflow}/${data.label}/`
    );
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
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: theme.palette.grey[700] }}
        data-testid="handle-target"
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
        data-testid="handle-source"
      />
    </Paper>
  );
};

export default TaskFlowNode;
