import TaskAltTwoToneIcon from "@mui/icons-material/TaskAltTwoTone";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import PendingTwoToneIcon from "@mui/icons-material/PendingTwoTone";
import ErrorTwoToneIcon from "@mui/icons-material/ErrorTwoTone";
import ReportProblemTwoToneIcon from "@mui/icons-material/ReportProblemTwoTone";
import CancelTwoToneIcon from "@mui/icons-material/CancelTwoTone";
import SkipNextTwoToneIcon from "@mui/icons-material/SkipNextTwoTone";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
import { Tooltip } from "@mui/material";
import { TaskStatus, WorkflowStatus } from "../../types";
import React from "react";

export function getTaskStatusIcon(status: TaskStatus, size: number = 25) {
  const TaskStatusIconMap: { [key in TaskStatus]: React.JSX.Element } = {
    PENDING: (
      <Tooltip title="Pending" data-testid="task-status-icon-pending">
        <PendingTwoToneIcon color="warning" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    RUNNING: (
      <Tooltip title="Running" data-testid="task-status-icon-running">
        <HourglassBottomIcon color="info" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    SUCCEEDED: (
      <Tooltip title="Succeeded" data-testid="task-status-icon-succeeded">
        <TaskAltTwoToneIcon color="success" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    SKIPPED: (
      <Tooltip title="Skipped" data-testid="task-status-icon-skipped">
        <SkipNextTwoToneIcon color="warning" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    FAILED: (
      <Tooltip title="Failed" data-testid="task-status-icon-failed">
        <CancelTwoToneIcon color="error" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    ERROR: (
      <Tooltip title="Error" data-testid="task-status-icon-error">
        <ErrorTwoToneIcon color="error" sx={{ fontSize: size }} />
      </Tooltip>
    ),
    OMITTED: (
      <Tooltip title="Omitted" data-testid="task-status-icon-omitted">
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
  const workflowStatusIconMap: { [key in WorkflowStatus]: React.JSX.Element } =
    {
      Unknown: (
        <Tooltip title="Unknown" data-testid="status-icon-unknown">
          <QuestionMarkIcon color="warning" sx={{ fontSize: size }} />
        </Tooltip>
      ),
      WorkflowPendingStatus: (
        <Tooltip title="Pending" data-testid="status-icon-pending">
          <PendingTwoToneIcon color="warning" sx={{ fontSize: size }} />
        </Tooltip>
      ),
      WorkflowRunningStatus: (
        <Tooltip title="Running" data-testid="status-icon-running">
          <HourglassBottomIcon color="info" sx={{ fontSize: size }} />
        </Tooltip>
      ),
      WorkflowSucceededStatus: (
        <Tooltip title="Succeeded" data-testid="status-icon-succeeded">
          <TaskAltTwoToneIcon color="success" sx={{ fontSize: size }} />
        </Tooltip>
      ),
      WorkflowFailedStatus: (
        <Tooltip title="Failed" data-testid="status-icon-failed">
          <CancelTwoToneIcon color="error" sx={{ fontSize: size }} />
        </Tooltip>
      ),
      WorkflowErroredStatus: (
        <Tooltip title="Errored" data-testid="status-icon-errored">
          <ReportProblemTwoToneIcon color="error" sx={{ fontSize: size }} />
        </Tooltip>
      ),
    };

  return workflowStatusIconMap[status];
}
