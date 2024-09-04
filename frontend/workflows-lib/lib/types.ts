export interface Task {
  name: string;
  workflow: string;
  status: string;
  depends?: string;
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
