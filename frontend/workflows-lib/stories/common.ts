import { WorkflowStatus, TaskStatus } from "../lib/types";

export const fakeTasksA = [
  {
    id: "task-1",
    name: "task-1",
    status: "SUCCEEDED" as TaskStatus,
  },
  {
    depends: ["task-1"],
    id: "task-2",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "SUCCEEDED" as TaskStatus,
  },
  {
    depends: ["task-1"],
    id: "task-3",
    name: "task-3",
    status: "RUNNING" as TaskStatus,
  },
  {
    id: "task-4",
    name: "task-4 ERFBAK3KJ34",
    status: "RUNNING" as TaskStatus,
  },
  {
    depends: ["task-3"],
    id: "task-6",
    name: "task-6 KNMNE9",
    status: "RUNNING" as TaskStatus,
  },
  {
    depends: ["task-3"],
    id: "task-7",
    name: "task-7 KLDJF034 DFJSOID 039402KDJO",
    status: "RUNNING" as TaskStatus,
  },
  {
    depends: ["task-3"],
    id: "task-8",
    name: "task-8",
    status: "RUNNING" as TaskStatus,
  },
  {
    depends: ["task-6"],
    id: "task-9",
    name: "task-9",
    status: "RUNNING" as TaskStatus,
  },
  {
    depends: ["task-9"],
    id: "task-10",
    name: "task-10",
    status: "RUNNING" as TaskStatus,
  },
];

export const fakeTasksB = [
  {
    id: "task-1",
    name: "task-1",
    status: "SUCCEEDED" as TaskStatus,
  },
  {
    depends: ["task-1"],
    id: "task-2",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "SUCCEEDED" as TaskStatus,
  },
];

export const fakeTasksC = [
  {
    id: "task-1",
    name: "task-1",
    status: "SUCCEEDED" as TaskStatus,
  },
  {
    id: "task-2",
    name: "task-2 DKJFOKJLSKDMFO",
    status: "SUCCEEDED" as TaskStatus,
  },
  {
    id: "task-3",
    name: "task-3",
    status: "SUCCEEDED" as TaskStatus,
  },
  {
    id: "task-4",
    name: "task-4 ERFBAK3KJ34",
    status: "RUNNING" as TaskStatus,
  },
  {
    id: "task-5",
    name: "task-5 EOI909D",
    status: "SUCCEEDED" as TaskStatus,
  },
  {
    id: "task-6",
    name: "task-6 KNMNE9",
    status: "RUNNING" as TaskStatus,
  },
  {
    id: "task-7",
    name: "task-7 KLDJF034 DFJSOID 039402KDJODKLFJLDJFLKSDJFLKJSD",
    status: "RUNNING" as TaskStatus,
  },
  {
    id: "task-8",
    name: "task-8",
    status: "PENDING" as TaskStatus,
  },
  {
    id: "task-9",
    name: "task-9",
    status: "PENDING" as TaskStatus,
  },
  {
    id: "task-10",
    name: "task-10",
    status: "PENDING" as TaskStatus,
  },
  {
    id: "task-11",
    name: "task-11",
    status: "PENDING" as TaskStatus,
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
};
