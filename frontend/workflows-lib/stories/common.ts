import { WorkflowStatus, TaskStatus, Artifact, Task } from "../lib/types";
import { Visit } from "@diamondlightsource/sci-react-ui";

const logArtifact: Artifact = {
  name: "main.log",
  url: "fakepath/to/main-logs",
  mimeType: "text/plain",
  parentTask: "task",
  parentTaskId: "id-12345",
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
    stepType: "DAG",
  },
  {
    depends: ["task-1"],
    id: "task-2",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "SUCCEEDED" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
    stepType: "POD",
  },
  {
    depends: ["task-1"],
    id: "task-3",
    name: "task-3",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
    stepType: "POD",
  },
  {
    id: "task-4",
    name: "task-4 ERFBAK3KJ34",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
    stepType: "POD",
  },
  {
    depends: ["task-3"],
    id: "task-6",
    name: "task-6 KNMNE9",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
    stepType: "POD",
  },
  {
    depends: ["task-3"],
    id: "task-7",
    name: "task-7 KLDJF034 DFJSOID 039402KDJO",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
    stepType: "POD",
  },
  {
    depends: ["task-3"],
    id: "task-8",
    name: "task-8",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
    stepType: "POD",
  },
  {
    depends: ["task-6"],
    id: "task-9",
    name: "task-9",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
    stepType: "POD",
  },
  {
    depends: ["task-9"],
    id: "task-10",
    name: "task-10",
    status: "RUNNING" as TaskStatus,
    artifacts: [logArtifact],
    workflow: "workflow1",
    instrumentSession: instrumentSession,
    stepType: "POD",
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

export const numpySchema = {
  type: "object",
  required: ["memory", "size"],
  properties: {
    memory: {
      default: "20Gi",
      type: "string",
      pattern: "^[0-9]+[GMK]i$",
    },
    size: {
      default: 2000,
      type: "integer",
    },
  },
};

export const numpyUiSchema = {
  type: "VerticalLayout",
  elements: [
    {
      type: "Control",
      scope: "#/properties/memory",
      label: "Memory",
    },
    {
      type: "Control",
      scope: "#/properties/size",
      label: "Matrix Size",
    },
  ],
};

export const customRendererSchema = {
  type: "object",
  properties: {
    filePath: {
      type: "string",
      minLength: 1,
    },
    scanRange: {
      type: "object",
      properties: {
        start: { type: "number" },
        end: { type: "number" },
        excluded: {
          type: "array",
          items: { type: "number" },
        },
      },
      required: ["start", "end", "excluded"],
    },
    calibrationFile: {
      type: "object",
      properties: {
        fileName: { type: "string" },
        content: { type: "string" },
        type: { type: "string" },
      },
    },
  },
  required: ["filePath"],
};

export const customRendererUiSchema = {
  type: "VerticalLayout",
  options: { formWidth: "50%" },
  elements: [
    {
      type: "HorizontalLayout",
      elements: [
        {
          type: "Control",
          scope: "#/properties/filePath",
        },
      ],
    },
    {
      type: "Control",
      scope: "#/properties/scanRange",
      options: {
        useScanRangeControl: true,
      },
    },
    {
      type: "Control",
      label: "Calibration File",
      scope: "#/properties/calibrationFile",
      options: {
        useFileUploadControl: true,
      },
    },
  ],
};
