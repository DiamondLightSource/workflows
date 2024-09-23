export type TaskStatus =
  | "Pending"
  | "Running"
  | "Succeeded"
  | "Skipped"
  | "Failed"
  | "Error"
  | "Omitted";

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
  | "Pending"
  | "Running"
  | "Succeeded"
  | "Failed"
  | "Errored";

export interface Workflow {
  name: string;
  status: WorkflowStatus;
  tasks: Task[];
}
