import { PayloadError } from "relay-runtime";

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
  stepType: string;
}

export interface Artifact {
  name: string;
  url: string;
  mimeType: string;
  parentTask: string;
  parentTaskId: string;
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
  instrumentSession: Visit;
  status: WorkflowStatus;
}

export interface Visit {
  proposalCode: string;
  proposalNumber: number;
  number: number;
}

export interface Template {
  name: string;
  description?: string | null;
  title?: string | null;
  maintainer: string;
  repository?: string | null;
}

export interface WorkflowQueryFilter {
  creator?: string;
  template?: string;
  workflowStatusFilter?: WorkflowStatusBool;
}

export interface WorkflowStatusBool {
  pending?: boolean;
  running?: boolean;
  succeeded?: boolean;
  failed?: boolean;
  error?: boolean;
}

export interface SubmissionSuccessMessage {
  type: "success";
  message: string;
}

export interface SubmissionNetworkErrorMessage {
  type: "networkError";
  error: Error;
}

export interface SubmissionGraphQLErrorMessage {
  type: "graphQLError";
  errors: PayloadError[];
}

export interface SubmissionData {
  submissionResult:
    | SubmissionSuccessMessage
    | SubmissionGraphQLErrorMessage
    | SubmissionNetworkErrorMessage;
  visit: Visit;
  workflowName?: string;
}

export interface UploadedFile {
  fileName: string;
  content: string | ArrayBuffer | null;
  type: string;
}

export interface ScanRange {
  start: number;
  end: number;
  excluded?: number[];
}

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONObject
  | JSONValue[];
export interface JSONObject {
  [key: string]: JSONValue;
}

export type ArtifactSortType = {
  name: "name" | "parentTask";
  order: boolean;
};
