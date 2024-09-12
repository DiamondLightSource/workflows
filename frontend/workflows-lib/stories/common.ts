import { WorkflowStatus } from "../lib/types";

export const fakeTasksA = [
  {
    workflow: "1",
    name: "task-1",
    status: "completed",
  },
  {
    depends: "task-1",
    workflow: "1",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "completed",
  },
  {
    depends: "task-1",
    workflow: "1",
    name: "task-3",
    status: "running",
  },
  {
    workflow: "1",
    name: "task-4 ERFBAK3KJ34",
    status: "running",
  },
  {
    depends: "task-3",
    workflow: "1",
    name: "task-6 KNMNE9",
    status: "running",
  },
  {
    depends: "task-3",
    workflow: "1",
    name: "task-7 KLDJF034 DFJSOID 039402KDJO",
    status: "running",
  },
  {
    depends: "task-3",
    workflow: "1",
    name: "task-8",
    status: "pending",
  },
  {
    depends: "task-6 KNMNE9",
    workflow: "1",
    name: "task-9",
    status: "pending",
  },
  {
    depends: "task-9",
    workflow: "1",
    name: "task-10",
    status: "pending",
  },
];

export const fakeTasksB = [
  {
    workflow: "2",
    name: "task-1",
    status: "completed",
  },
  {
    depends: "task-1",
    workflow: "2",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "completed",
  },
];

export const fakeTasksC = [
  {
    workflow: "1",
    name: "task-1",
    status: "completed",
  },
  {
    workflow: "1",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "completed",
  },
  {
    workflow: "1",
    name: "task-3",
    status: "completed",
  },
  {
    workflow: "1",
    name: "task-4 ERFBAK3KJ34",
    status: "running",
  },
  {
    workflow: "1",
    name: "task-5 EOI909D",
    status: "completed",
  },
  {
    workflow: "1",
    name: "task-6 KNMNE9",
    status: "running",
  },
  {
    workflow: "1",
    name: "task-7 KLDJF034 DFJSOID 039402KDJODKLFJLDJFLKSDJFLKJSD",
    status: "running",
  },
  {
    workflow: "1",
    name: "task-8",
    status: "pending",
  },
  {
    workflow: "1",
    name: "task-9",
    status: "pending",
  },
  {
    workflow: "1",
    name: "task-10",
    status: "pending",
  },
  {
    workflow: "1",
    name: "task-11",
    status: "pending",
  },
  {
    workflow: "1",
    name: "task-12",
    status: "completed",
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
