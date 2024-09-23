import TaskAltTwoToneIcon from "@mui/icons-material/TaskAltTwoTone";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import PendingTwoToneIcon from "@mui/icons-material/PendingTwoTone";
import ErrorTwoToneIcon from "@mui/icons-material/ErrorTwoTone";
import ReportProblemTwoToneIcon from "@mui/icons-material/ReportProblemTwoTone";
import CancelTwoToneIcon from "@mui/icons-material/CancelTwoTone";
import SkipNextTwoToneIcon from "@mui/icons-material/SkipNextTwoTone";
import { Tooltip } from "@mui/material";
import { TaskStatus, WorkflowStatus } from "../../types";

export function getTaskStatusIcon(status: TaskStatus, size: number = 25) {
  const TaskStatusIconMap: { [key in TaskStatus]: JSX.Element } = {
    Pending: (
      <Tooltip title="Pending">
        <PendingTwoToneIcon color="warning" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    Running: (
      <Tooltip title="Running">
        <HourglassBottomIcon color="info" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    Succeeded: (
      <Tooltip title="Succeeded">
        <TaskAltTwoToneIcon color="success" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    Skipped: (
      <Tooltip title="Skipped">
        <SkipNextTwoToneIcon color="warning" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    Failed: (
      <Tooltip title="Failed">
        <CancelTwoToneIcon color="error" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    Error: (
      <Tooltip title="Error">
        <ErrorTwoToneIcon color="error" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    Omitted: (
      <Tooltip title="Omitted">
        <ReportProblemTwoToneIcon color="warning" sx={{ fontSize: size }} />
      </Tooltip>
    ),
  };

  return TaskStatusIconMap[status];
}

export function getWorkflowStatusIcon(
  status: WorkflowStatus,
  size: number = 25
) {
  const workflowStatusIconMap: { [key in WorkflowStatus]: JSX.Element } = {
    Pending: (
      <Tooltip title="Pending">
        <PendingTwoToneIcon color="warning" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    Running: (
      <Tooltip title="Running">
        <HourglassBottomIcon color="info" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    Succeeded: (
      <Tooltip title="Succeeded">
        <TaskAltTwoToneIcon color="success" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    Failed: (
      <Tooltip title="Failed">
        <CancelTwoToneIcon color="error" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    Errored: (
      <Tooltip title="Errored">
        <ReportProblemTwoToneIcon color="error" sx={{ fontSize: size }} />
      </Tooltip>
    ),
  };

  return workflowStatusIconMap[status];
}
