import { ImageInfo } from "../../lib/components/workflow/ScrollableImages";
import { Artifact, TaskStatus } from "../../lib/types";
import { Visit } from "@diamondlightsource/sci-react-ui";

export const logArtifact: Artifact = {
  name: "main.log",
  url: "fakepath/to/main.log",
  mimeType: "text/plain",
  parentTask: "task",
};

export const mockArtifacts: Artifact[] = [
  logArtifact,
  {
    name: "image1.png",
    mimeType: "image/png",
    url: "fakepath/to/image1.png",
    parentTask: "task1",
  },

  {
    name: "textfile.txt",
    mimeType: "text/plain",
    url: "fakepath/to/textfile.txt",
    parentTask: "task2",
  },
  {
    name: "image2.png",
    mimeType: "image/png",
    url: "fakepath/to/image2.png",
    parentTask: "task3",
  },
];

export const mockImages: ImageInfo[] = [
  {
    src: "fakepath/to/image1.png",
    alt: "Gallery Image 1",
  },

  {
    src: "fakepath/to/image2.png",
    alt: "Gallery Image 2",
  },
  {
    src: "fakepath/to/image3.png",
    alt: "Gallery Image 3",
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
    stepType: "POD",
  },
  {
    id: "task-2",
    name: "task-2",
    status: "Succeeded" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow-test",
    instrumentSession: instrumentSession,
    depends: ["task-1"],
    stepType: "POD",
  },
  {
    id: "task-3",
    name: "task-3",
    status: "Running" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow-test",
    instrumentSession: instrumentSession,
    stepType: "POD",
  },
];
