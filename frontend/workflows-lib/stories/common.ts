import { WorkflowStatus, TaskStatus } from "../lib/types";

export const fakeTasksA = [
  {
    id: "task-1",
    name: "task-1",
    status: "Succeeded" as TaskStatus,
  },
  {
    depends: ["task-1"],
    id: "task-2",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "Succeeded" as TaskStatus,
  },
  {
    depends: ["task-1"],
    id: "task-3",
    name: "task-3",
    status: "Running" as TaskStatus,
  },
  {
    id: "task-4",
    name: "task-4 ERFBAK3KJ34",
    status: "Running" as TaskStatus,
  },
  {
    depends: ["task-3"],
    id: "task-6",
    name: "task-6 KNMNE9",
    status: "Running" as TaskStatus,
  },
  {
    depends: ["task-3"],
    id: "task-7",
    name: "task-7 KLDJF034 DFJSOID 039402KDJO",
    status: "Running" as TaskStatus,
  },
  {
    depends: ["task-3"],
    id: "task-8",
    name: "task-8",
    status: "Pending" as TaskStatus,
  },
  {
    depends: ["task-6"],
    id: "task-9",
    name: "task-9",
    status: "Pending" as TaskStatus,
  },
  {
    depends: ["task-9"],
    id: "task-10",
    name: "task-10",
    status: "Pending" as TaskStatus,
  },
];

export const fakeTasksB = [
  {
    id: ["task-1"],
    name: "task-1",
    status: "Succeeeded" as TaskStatus,
  },
  {
    depends: ["task-1"],
    id: "task-2",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "Succeeded" as TaskStatus,
  },
];

export const fakeTasksC = [
  {
    id: "task-1",
    name: "task-1",
    status: "Succeeded" as TaskStatus,
  },
  {
    id: "task-2",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "Succeeded" as TaskStatus,
  },
  {
    id: "task-3",
    name: "task-3",
    status: "Succeeded" as TaskStatus,
  },
  {
    id: "task-4",
    name: "task-4 ERFBAK3KJ34",
    status: "Running" as TaskStatus,
  },
  {
    id: "task-5",
    name: "task-5 EOI909D",
    status: "Succeeded" as TaskStatus,
  },
  {
    id: "task-6",
    name: "task-6 KNMNE9",
    status: "Running" as TaskStatus,
  },
  {
    id: "task-7",
    name: "task-7 KLDJF034 DFJSOID 039402KDJODKLFJLDJFLKSDJFLKJSD",
    status: "Running" as TaskStatus,
  },
  {
    id: "task-8",
    name: "task-8",
    status: "Pending" as TaskStatus,
  },
  {
    id: "task-9",
    name: "task-9",
    status: "Pending" as TaskStatus,
  },
  {
    id: "task-10",
    name: "task-10",
    status: "Pending" as TaskStatus,
  },
  {
    id: "task-11",
    name: "task-11",
    status: "Pending" as TaskStatus,
  },
  {
    id: "task-12",
    name: "task-12",
    status: "Succeeded" as TaskStatus,
  },
];

export const fakeWorkflowA = {
  name: "Workflow 1",
  status: "Failed" as WorkflowStatus,
  tasks: fakeTasksA,
};

export const fakeWorkflowB = {
  name: "Workflow 2",
  status: "Succeeded" as WorkflowStatus,
  tasks: fakeTasksB,
};

export const fakeWorkflowC = {
  name: "Workflow 3",
  status: "Running" as WorkflowStatus,
  tasks: fakeTasksC,
};
