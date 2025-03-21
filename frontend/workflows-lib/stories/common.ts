import { WorkflowStatus, TaskStatus, Artifact, Task } from "../lib/types";
import { Visit } from "@diamondlightsource/sci-react-ui";

const logArtifact: Artifact = {
  name: "main.log",
  url: "fakepath/to/main-logs",
  mimeType: "text/plain",
};

const instrumentSession: Visit = {
  proposalCode: "xx",
  proposalNumber: 98765,
  number: 1,
};

export const fakeTasksA: Task[] = [
  {
    id: "task-1",
    name: "task-1",
    status: "SUCCEEDED" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    depends: ["task-1"],
    id: "task-2",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "SUCCEEDED" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    depends: ["task-1"],
    id: "task-3",
    name: "task-3",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    id: "task-4",
    name: "task-4 ERFBAK3KJ34",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    depends: ["task-3"],
    id: "task-6",
    name: "task-6 KNMNE9",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    depends: ["task-3"],
    id: "task-7",
    name: "task-7 KLDJF034 DFJSOID 039402KDJO",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    depends: ["task-3"],
    id: "task-8",
    name: "task-8",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    depends: ["task-6"],
    id: "task-9",
    name: "task-9",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    depends: ["task-9"],
    id: "task-10",
    name: "task-10",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
];

export const fakeTasksB = [
  {
    id: "task-1",
    name: "task-1",
    status: "SUCCEEDED" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    depends: ["task-1"],
    id: "task-2",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "SUCCEEDED" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
];

export const fakeTasksC = [
  {
    id: "task-1",
    name: "task-1",
    status: "SUCCEEDED" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    id: "task-2",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "SUCCEEDED" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    id: "task-3",
    name: "task-3",
    status: "SUCCEEDED" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    id: "task-4",
    name: "task-4 ERFBAK3KJ34",
    status: "RUNNING" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    id: "task-5",
    name: "task-5 EOI909D",
    status: "SUCCEEDED" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    id: "task-6",
    name: "task-6 KNMNE9",
    status: "RUNNING" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    id: "task-7",
    name: "task-7 KLDJF034 DFJSOID 039402KDJODKLFJLDJFLKSDJFLKJSD",
    status: "RUNNING" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    id: "task-8",
    name: "task-8",
    status: "PENDING" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    id: "task-9",
    name: "task-9",
    status: "PENDING" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    id: "task-10",
    name: "task-10",
    status: "PENDING" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    id: "task-11",
    name: "task-11",
    status: "PENDING" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
  {
    id: "task-12",
    name: "task-12",
    status: "Succeeded" as TaskStatus,
    workflow: "workflow1",
    instrumentSession: instrumentSession,
  },
];

export const fakeWorkflowA = {
  name: "Workflow 1",
  status: "Failed" as WorkflowStatus,
  workflow: "workflow1",
  instrumentSession: instrumentSession,
};
