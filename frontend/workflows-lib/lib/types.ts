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
  artifacts: Artifact[];
  workflow: string;
  instrumentSession: Visit;
}

export interface Artifact {
  name: string;
  url: string;
  mimeType: string;
}

export interface TaskNode extends Task {
  children?: TaskNode[];
}

export type WorkflowStatus =
  | "Unknown"
  | "WorkflowPendingStatus"
  | "WorkflowRunningStatus"
  | "WorkflowSucceededStatus"
  | "WorkflowFailedStatus"
  | "WorkflowErroredStatus";

export interface Workflow {
  name: string;
  status: WorkflowStatus;
}

export interface Visit {
  proposalCode: string;
  proposalNumber: number;
  number: number;
}
