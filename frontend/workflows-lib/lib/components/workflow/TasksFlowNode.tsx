import { Box, Paper, Typography, useTheme } from "@mui/material";
import React from "react";
import { Handle, Position } from "@xyflow/react";
import { getStatusIcon } from "../common/StatusIcons";

interface TaskFlowNodeProps {
  data: {
    label: string;
    status: string;
  };
}

const TaskFlowNode: React.FC<TaskFlowNodeProps> = ({ data }) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={8}
      sx={{
        padding: theme.spacing(1.5),
        minWidth: 140,
        maxWidth: 160,
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
        minWidth={120}
      >
        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 500 }}>
          {data.label}
        </Typography>
        {getStatusIcon(data.status)}
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
