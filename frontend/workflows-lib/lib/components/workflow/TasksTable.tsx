import React from "react";
import { Grid, Paper, Typography, useTheme } from "@mui/material";
import { Task } from "../../types";
import { getStatusIcon } from "../common/StatusIcons";

interface TaskTableProps {
  tasks: Task[];
}

const TasksTable: React.FC<TaskTableProps> = ({ tasks }) => {
  const theme = useTheme();
  return (
    <Grid container spacing={1.5} padding={2} sx={{ overflow: "auto" }}>
      {tasks.map((task) => (
        <Grid item key={task.name} xs="auto">
          <Paper
            elevation={8}
            sx={{
              padding: theme.spacing(1.5),
              minWidth: 180,
              maxWidth: 180,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Typography variant="subtitle1" noWrap sx={{ fontWeight: 500 }}>
              {task.name}
            </Typography>
            {getStatusIcon(task.status)}
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};

export default TasksTable;
