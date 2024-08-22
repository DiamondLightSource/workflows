import TaskAltTwoToneIcon from "@mui/icons-material/TaskAltTwoTone";
import HourglassBottomIcon from "@mui/icons-material/HourglassBottom";
import PendingTwoToneIcon from "@mui/icons-material/PendingTwoTone";
import ErrorTwoToneIcon from "@mui/icons-material/ErrorTwoTone";

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
