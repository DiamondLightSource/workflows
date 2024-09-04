import TaskAltTwoToneIcon from "@mui/icons-material/TaskAltTwoTone";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import PendingTwoToneIcon from "@mui/icons-material/PendingTwoTone";
import ErrorTwoToneIcon from "@mui/icons-material/ErrorTwoTone";
import ReportProblemTwoToneIcon from "@mui/icons-material/ReportProblemTwoTone";
import CancelTwoToneIcon from "@mui/icons-material/CancelTwoTone";
import { WorkflowStatus } from "../../types";

export const getStatusIcon = (status: string, size: number = 25) => {
  switch (status) {
    case "completed":
      return <TaskAltTwoToneIcon color="success" sx={{ fontSize: size }} />;
    case "running":
      return <HourglassBottomIcon color="info" sx={{ fontSize: size }} />;
    case "pending":
      return <PendingTwoToneIcon color="warning" sx={{ fontSize: size }} />;
    case "failed":
      return <ErrorTwoToneIcon color="error" sx={{ fontSize: size }} />;
    default:
      return null;
  }
};

export function getWorkflowStatusIcon(
  status: WorkflowStatus,
  size: number = 25
) {
  const workflowStatusIconMap: { [key in WorkflowStatus]: JSX.Element } = {
    Pending: <PendingTwoToneIcon color="warning" sx={{ fontSize: size }} />,
    Running: <HourglassBottomIcon color="info" sx={{ fontSize: size }} />,
    Succeeded: <TaskAltTwoToneIcon color="success" sx={{ fontSize: size }} />,
    Failed: <CancelTwoToneIcon color="error" sx={{ fontSize: size }} />,
    Errored: <ReportProblemTwoToneIcon color="error" sx={{ fontSize: size }} />,
  };

  return workflowStatusIconMap[status];
}
