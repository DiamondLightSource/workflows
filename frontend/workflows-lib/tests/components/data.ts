import { Artifact, TaskStatus } from "../../lib/types";
import { Visit } from "@diamondlightsource/sci-react-ui";

export const logArtifact: Artifact = {
  name: "main.log",
  url: "fakepath/to/main.log",
  mimeType: "text/plain",
};

export const mockArtifacts: Artifact[] = [
  logArtifact,
  {
    name: "image1.png",
    mimeType: "image/png",
    url: "fakepath/to/image1.png",
  },

  {
    name: "textfile.txt",
    mimeType: "text/plain",
    url: "fakepath/to/textfile.txt",
  },
  {
    name: "image2.png",
    mimeType: "image/png",
    url: "fakepath/to/image2.png",
  },
];

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
    stepType: "POD"
  },
  {
    id: "task-2",
    name: "task-2",
    status: "Succeeded" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow-test",
    instrumentSession: instrumentSession,
    depends: ["task-1"],
    stepType: "POD"
  },
  {
    id: "task-3",
    name: "task-3",
    status: "Running" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow-test",
    instrumentSession: instrumentSession,
    stepType: "POD"
  },
];
