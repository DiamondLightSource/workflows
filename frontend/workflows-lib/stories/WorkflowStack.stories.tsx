import type { Meta, StoryObj } from "@storybook/react";
import WorkflowStack from "../lib/components/workflow/WorkflowStack";
import { WorkflowStatus } from "../lib/types";

const fakeTasks_1 = [
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
    workflow: "1",
    name: "task-5 EOI909D",
    status: "completed",
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
    name: "task-7 KLDJF034 DFJSOID 039402KDJODKLFJLDJFLKSDJFLKJSD",
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
  {
    depends: "task-10",
    workflow: "1",
    name: "task-11",
    status: "pending",
  },
  {
    depends: "task-5 EOI909D",
    workflow: "1",
    name: "task-12",
    status: "failed",
  },
];

const fakeTasks_2 = [
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

const fakeTasks_3 = [
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

const fakeWorkflows = [
  {
    name: "Workflow 1",
    status: "Failed" as WorkflowStatus,
    tasks: fakeTasks_1,
  },
  {
    name: "Workflow 2",
    status: "Succeeded" as WorkflowStatus,
    tasks: fakeTasks_2,
  },
  {
    name: "Workflow 3",
    status: "Running" as WorkflowStatus,
    tasks: fakeTasks_3,
  },
];

const meta: Meta<typeof WorkflowStack> = {
  title: "Workflow",
  component: WorkflowStack,
};

type Story = StoryObj<typeof WorkflowStack>;

export default meta;
export const Stack: Story = {
  args: {
    workflows: fakeWorkflows,
  },
};
