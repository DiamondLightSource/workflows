import { Box, Paper, Typography, useTheme } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import React, { useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { getTaskStatusIcon } from "../common/StatusIcons";
import { Artifact, TaskStatus } from "../../types";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import Link from "@mui/material/Link";
import { Tooltip } from "@mui/material";

interface TaskFlowNodeProps {
  data: {
    label: string;
    status: TaskStatus;
    details: Artifact[];
  };
}

const TaskFlowNode: React.FC<TaskFlowNodeProps> = ({ data }) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = () => {
    if (data.details && data.details.length > 0) {
      setExpanded(!expanded);
    }
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
      onClick={handleExpandClick}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: theme.palette.grey[700] }}
      />
      <Box sx={{ flexDirection: "column" }}>
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
            >
              {data.label}
            </Typography>
          </Tooltip>
          {getTaskStatusIcon(data.status)}
          <Tooltip title="Show artifacts">
            <span>
              <IconButton
                onClick={handleExpandClick}
                disabled={!(data.details && data.details.length > 0)}
              >
                {expanded ? <RemoveIcon /> : <AddIcon />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        {expanded && (
          <>
            <List>
              {data.details.map((artifact) => (
                <ListItem key={artifact.name}>
                  <Link
                    href={artifact.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <ListItemText primary={artifact.name} />
                  </Link>
                </ListItem>
              ))}
            </List>
          </>
        )}
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
