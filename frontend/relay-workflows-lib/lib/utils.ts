import { WorkflowStatusType } from "./types";

export const isWorkflowWithTasks = (status: WorkflowStatusType) => {
    return (
      status.__typename === "WorkflowErroredStatus" ||
      status.__typename === "WorkflowFailedStatus" ||
      status.__typename === "WorkflowRunningStatus" ||
      status.__typename === "WorkflowSucceededStatus"
    );
  };

