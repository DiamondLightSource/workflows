export type TaskStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "SKIPPED"
  | "FAILED"
  | "ERROR"
  | "OMITTED";

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  depends?: string[];
}

export interface TaskNode extends Task {
  children?: TaskNode[];
}

export type WorkflowStatus =
  | "Unknown"
  | "Pending"
  | "Running"
  | "Succeeded"
  | "Failed"
  | "Errored";

export interface Workflow {
  name: string;
  status: WorkflowStatus;
}
