import { Artifact, TaskStatus } from "../../lib/types";
import { Visit } from "@diamondlightsource/sci-react-ui";

export const logArtifact: Artifact = {
  name: "main.log",
  url: "fakepath/to/main-logs",
  mimeType: "text/plain",
};

export const instrumentSession: Visit = {
  proposalCode: "xx",
  proposalNumber: 98765,
  number: 1,
};

export const mockTasks = [
  {
    id: "task-1",
    name: "task-1",
    status: "Pending" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow-test",
    instrumentSession: instrumentSession,
  },
  {
    id: "task-2",
    name: "task-2",
    status: "Succeeded" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow-test",
    instrumentSession: instrumentSession,
    depends: ["task-1"],
  },
  {
    id: "task-3",
    name: "task-3",
    status: "Running" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow-test",
    instrumentSession: instrumentSession,
  },
];
